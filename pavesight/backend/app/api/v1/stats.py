from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.detection import Detection
from app.schemas.stats import StatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    total = db.query(Detection).count()

    by_severity = {
        severity: count
        for severity, count in db.query(Detection.severity, func.count(Detection.id)).group_by(
            Detection.severity
        )
    }
    for key in ("low", "medium", "high"):
        by_severity.setdefault(key, 0)

    by_status = {
        status_: count
        for status_, count in db.query(Detection.status, func.count(Detection.id)).group_by(
            Detection.status
        )
    }
    for key in ("pending", "scheduled", "repaired"):
        by_status.setdefault(key, 0)

    return StatsResponse(total=total, by_severity=by_severity, by_status=by_status)
