from typing import Literal

from pydantic import BaseModel


class HeatmapFeatureProperties(BaseModel):
    weight: float
    severity: Literal["low", "medium", "high"]


class HeatmapFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict
    properties: HeatmapFeatureProperties


class HeatmapFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[HeatmapFeature]
