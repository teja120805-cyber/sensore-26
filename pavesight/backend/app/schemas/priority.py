from typing import Literal

from pydantic import BaseModel


class PriorityCluster(BaseModel):
    cluster_id: int
    centroid_lat: float
    centroid_lon: float
    score: float
    detection_count: int
    dominant_severity: Literal["low", "medium", "high"]
    detection_ids: list[int]


class PriorityClusterResponse(BaseModel):
    clusters: list[PriorityCluster]
