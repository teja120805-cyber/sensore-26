import base64
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_email
from app.core.config import settings
from app.db.session import get_db
from app.models.detection import Detection
from app.models.status_history import StatusHistory
from app.schemas.detection import (
    DetectionIngest,
    DetectionListResponse,
    DetectionOut,
    DetectionUpdate,
    DetectionUpdateResponse,
)
from app.services.geo import bbox_filter, detection_lat, detection_lon, make_point

router = APIRouter(prefix="/detections", tags=["detections"])


def _to_out(detection: Detection, lon: float, lat: float) -> DetectionOut:
    return DetectionOut(
        id=detection.id,
        reported_at=detection.reported_at,
        lat=lat,
        lon=lon,
        altitude_m=detection.altitude_m,
        defect_class=detection.defect_class,
        severity=detection.severity,
        confidence=detection.confidence,
        area_m2=detection.area_m2,
        image_url=detection.image_url,
        status=detection.status,
        created_at=detection.created_at,
    )


def _fetch_one_with_coords(db: Session, detection_id: int) -> tuple[Detection, float, float] | None:
    row = (
        db.query(Detection, detection_lon(Detection.geom), detection_lat(Detection.geom))
        .filter(Detection.id == detection_id)
        .first()
    )
    if row is None:
        return None
    detection, lon, lat = row
    return detection, lon, lat


def _save_image(image_base64: str) -> str:
    media_dir = Path(settings.media_root)
    media_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    data = base64.b64decode(image_base64)
    (media_dir / filename).write_bytes(data)
    return f"{settings.media_url_prefix}/{filename}"


@router.post("", response_model=DetectionOut, status_code=status.HTTP_201_CREATED)
def ingest_detection(payload: DetectionIngest, db: Session = Depends(get_db)) -> DetectionOut:
    image_url = _save_image(payload.image_base64) if payload.image_base64 else None

    detection = Detection(
        reported_at=payload.timestamp,
        geom=make_point(payload.lon, payload.lat),
        altitude_m=payload.altitude_m,
        defect_class=payload.defect_class,
        severity=payload.severity,
        confidence=payload.confidence,
        area_m2=payload.area_m2,
        image_url=image_url,
        status="pending",
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    _, lon, lat = _fetch_one_with_coords(db, detection.id)
    return _to_out(detection, lon, lat)


@router.get("", response_model=DetectionListResponse)
def list_detections(
    db: Session = Depends(get_db),
    bbox: str | None = Query(
        None, description="min_lon,min_lat,max_lon,max_lat"
    ),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    severity: list[str] | None = Query(None),
    status_filter: list[str] | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> DetectionListResponse:
    query = db.query(Detection)

    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = (float(x) for x in bbox.split(","))
        except ValueError as exc:
            raise HTTPException(
                status_code=422, detail="bbox must be 'min_lon,min_lat,max_lon,max_lat'"
            ) from exc
        query = bbox_filter(query, min_lon, min_lat, max_lon, max_lat)

    if date_from:
        query = query.filter(Detection.reported_at >= date_from)
    if date_to:
        query = query.filter(Detection.reported_at <= date_to)
    if severity:
        query = query.filter(Detection.severity.in_(severity))
    if status_filter:
        query = query.filter(Detection.status.in_(status_filter))

    total = query.count()
    coord_query = query.add_columns(
        detection_lon(Detection.geom).label("lon"), detection_lat(Detection.geom).label("lat")
    )
    rows = coord_query.order_by(Detection.reported_at.desc()).offset(offset).limit(limit).all()
    items = [_to_out(detection, lon, lat) for detection, lon, lat in rows]
    return DetectionListResponse(total=total, limit=limit, offset=offset, items=items)


@router.get("/{detection_id}", response_model=DetectionOut)
def get_detection(detection_id: int, db: Session = Depends(get_db)) -> DetectionOut:
    result = _fetch_one_with_coords(db, detection_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Detection not found")
    detection, lon, lat = result
    return _to_out(detection, lon, lat)


@router.patch("/{detection_id}", response_model=DetectionUpdateResponse)
def update_detection_status(
    detection_id: int,
    payload: DetectionUpdate,
    db: Session = Depends(get_db),
    admin_email: str = Depends(get_current_admin_email),
) -> DetectionUpdateResponse:
    detection = db.get(Detection, detection_id)
    if detection is None:
        raise HTTPException(status_code=404, detail="Detection not found")

    old_status = detection.status
    detection.status = payload.status
    history = StatusHistory(
        detection_id=detection.id,
        old_status=old_status,
        new_status=payload.status,
        changed_by=admin_email,
    )
    db.add(history)
    db.commit()
    db.refresh(detection)
    db.refresh(history)

    _, lon, lat = _fetch_one_with_coords(db, detection.id)
    out = _to_out(detection, lon, lat)
    return DetectionUpdateResponse(**out.model_dump(), status_history=[history])
