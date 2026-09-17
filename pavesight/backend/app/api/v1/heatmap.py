from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.detection import Detection
from app.schemas.heatmap import HeatmapFeature, HeatmapFeatureCollection, HeatmapFeatureProperties
from app.services.geo import detection_lat, detection_lon
from app.services.priority import severity_weight

router = APIRouter(prefix="/heatmap", tags=["heatmap"])


@router.get("", response_model=HeatmapFeatureCollection)
def get_heatmap(db: Session = Depends(get_db)) -> HeatmapFeatureCollection:
    rows = db.query(
        detection_lon(Detection.geom).label("lon"),
        detection_lat(Detection.geom).label("lat"),
        Detection.severity,
        Detection.confidence,
    ).all()

    features = [
        HeatmapFeature(
            geometry={"type": "Point", "coordinates": [row.lon, row.lat]},
            properties=HeatmapFeatureProperties(
                weight=severity_weight(row.severity) * row.confidence,
                severity=row.severity,
            ),
        )
        for row in rows
    ]
    return HeatmapFeatureCollection(features=features)
