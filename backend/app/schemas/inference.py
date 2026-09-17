from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.detection import Severity

DepthLabel = Literal["shallow", "moderate", "deep", "unknown"]


class DetectionBox(BaseModel):
    class_name: str
    confidence: float
    severity: Severity
    # Pixel coordinates in the submitted image.
    x1: float
    y1: float
    x2: float
    y2: float
    area_fraction: float
    # Shadow-based visual heuristic, NOT a physical depth measurement - see
    # estimate_relative_depth() in services/inference.py for the caveat.
    relative_depth_score: float
    depth_label: DepthLabel


class InferenceResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    image_width: int
    image_height: int
    detections: list[DetectionBox]
    model_version: str
