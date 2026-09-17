"""Runs the fine-tuned YOLOv8 road-damage model against an uploaded frame.

Decoding is done with OpenCV (cv2.imdecode) and detection with Ultralytics
YOLOv8 - the model is loaded once (lru_cache) and reused across requests.
"""
import functools
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from app.core.config import settings
from app.schemas.detection import Severity
from app.schemas.inference import DetectionBox, InferenceResponse


class ModelNotAvailable(RuntimeError):
    pass


@functools.lru_cache(maxsize=1)
def _load_model() -> YOLO:
    model_path = Path(settings.inference_model_path)
    if not model_path.exists():
        raise ModelNotAvailable(
            f"No detection model found at {model_path}. Train or copy a model there first."
        )
    return YOLO(str(model_path))


def severity_for_area_fraction(fraction: float) -> Severity:
    if fraction >= 0.12:
        return "high"
    if fraction >= 0.04:
        return "medium"
    return "low"


def run_inference(image_bytes: bytes) -> InferenceResponse:
    model = _load_model()

    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")

    height, width = image.shape[:2]
    image_area = float(width * height)

    results = model.predict(image, conf=settings.inference_confidence_threshold, verbose=False)
    result = results[0]

    detections: list[DetectionBox] = []
    for box in result.boxes:
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
        confidence = float(box.conf[0])
        class_id = int(box.cls[0])
        class_name = result.names.get(class_id, str(class_id))
        area_fraction = ((x2 - x1) * (y2 - y1)) / image_area if image_area else 0.0

        detections.append(
            DetectionBox(
                class_name=class_name,
                confidence=confidence,
                severity=severity_for_area_fraction(area_fraction),
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
                area_fraction=area_fraction,
            )
        )

    detections.sort(key=lambda d: d.confidence, reverse=True)

    return InferenceResponse(
        image_width=width,
        image_height=height,
        detections=detections,
        model_version=Path(settings.inference_model_path).stem,
    )
