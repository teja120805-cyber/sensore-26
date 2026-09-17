from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.detection import Detection
from app.schemas.priority import PriorityCluster
from app.services.geo import as_geometry, detection_lat, detection_lon
from app.services.priority import ScoredDetection, cluster_score, dominant_severity


def compute_priority_clusters(db: Session, now: datetime | None = None) -> list[PriorityCluster]:
    """Group detections into spatial clusters with ST_ClusterDBSCAN and rank by PriorityScore."""
    now = now or datetime.now(timezone.utc)

    cluster_id_col = func.ST_ClusterDBSCAN(
        as_geometry(Detection.geom),
        settings.cluster_eps_degrees,
        settings.cluster_min_points,
    ).over().label("cluster_id")

    rows = db.query(
        Detection.id,
        Detection.severity,
        Detection.confidence,
        Detection.reported_at,
        detection_lon(Detection.geom).label("lon"),
        detection_lat(Detection.geom).label("lat"),
        cluster_id_col,
    ).all()

    groups: dict[int, list] = {}
    for row in rows:
        if row.cluster_id is None:
            continue
        groups.setdefault(row.cluster_id, []).append(row)

    clusters: list[PriorityCluster] = []
    for cid, members in groups.items():
        scored = [
            ScoredDetection(
                id=m.id,
                severity=m.severity,
                confidence=m.confidence,
                age_days=max((now - _as_aware(m.reported_at)).total_seconds() / 86400.0, 0.0),
            )
            for m in members
        ]
        score = cluster_score(scored)
        centroid_lat = sum(m.lat for m in members) / len(members)
        centroid_lon = sum(m.lon for m in members) / len(members)
        clusters.append(
            PriorityCluster(
                cluster_id=cid,
                centroid_lat=centroid_lat,
                centroid_lon=centroid_lon,
                score=score,
                detection_count=len(members),
                dominant_severity=dominant_severity(scored),
                detection_ids=[m.id for m in members],
            )
        )

    clusters.sort(key=lambda c: c.score, reverse=True)
    return clusters


def _as_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
