from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.priority import PriorityClusterResponse
from app.services.clustering import compute_priority_clusters

router = APIRouter(prefix="/priority-clusters", tags=["priority"])


@router.get("", response_model=PriorityClusterResponse)
def get_priority_clusters(
    limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)
) -> PriorityClusterResponse:
    clusters = compute_priority_clusters(db)
    return PriorityClusterResponse(clusters=clusters[:limit])
