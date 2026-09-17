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
from app.schemas.inference import DepthLabel, DetectionBox, InferenceResponse


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


def estimate_relative_depth(
    gray: np.ndarray, x1: float, y1: float, x2: float, y2: float
) -> tuple[float, DepthLabel]:
    """A relative "how much darker is the inside of this box than the road
    right around it" score - potholes read darker at the bottom because of
    the shadow their own walls cast, roughly in proportion to how deep they
    are. This is NOT a physical depth measurement (no stereo/LiDAR here),
    just a shadow-based visual heuristic, same spirit as the area-based
    severity estimate above.
    """
    height, width = gray.shape
    xi1, yi1 = max(0, int(x1)), max(0, int(y1))
    xi2, yi2 = min(width, int(x2)), min(height, int(y2))
    if xi2 <= xi1 or yi2 <= yi1:
        return 0.0, "unknown"

    inside_mean = float(gray[yi1:yi2, xi1:xi2].mean())

    box_w, box_h = xi2 - xi1, yi2 - yi1
    margin_x, margin_y = max(4, box_w // 4), max(4, box_h // 4)
    ox1, oy1 = max(0, xi1 - margin_x), max(0, yi1 - margin_y)
    ox2, oy2 = min(width, xi2 + margin_x), min(height, yi2 + margin_y)

    outer = gray[oy1:oy2, ox1:ox2]
    ring_mask = np.ones(outer.shape, dtype=bool)
    ring_mask[(yi1 - oy1) : (yi2 - oy1), (xi1 - ox1) : (xi2 - ox1)] = False
    ring_pixels = outer[ring_mask]
    if ring_pixels.size == 0:
        return 0.0, "unknown"

    surround_mean = float(ring_pixels.mean())
    if surround_mean <= 1e-6:
        return 0.0, "unknown"

    score = max(0.0, min(1.0, (surround_mean - inside_mean) / surround_mean))

    # Thresholds calibrated against this project's training images (darkness
    # contrast in real photos is much subtler than it sounds) - revisit if
    # ported to a different camera/lighting setup.
    label: DepthLabel
    if score < 0.04:
        label = "shallow"
    elif score < 0.10:
        label = "moderate"
    else:
        label = "deep"

    return round(score, 3), label


def run_inference(image_bytes: bytes) -> InferenceResponse:
    model = _load_model()

    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")

    height, width = image.shape[:2]
    image_area = float(width * height)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    results = model.predict(image, conf=settings.inference_confidence_threshold, verbose=False)
    result = results[0]

    detections: list[DetectionBox] = []
    for box in result.boxes:
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
        confidence = float(box.conf[0])
        class_id = int(box.cls[0])
        class_name = result.names.get(class_id, str(class_id))
        area_fraction = ((x2 - x1) * (y2 - y1)) / image_area if image_area else 0.0
        depth_score, depth_label = estimate_relative_depth(gray, x1, y1, x2, y2)

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
                relative_depth_score=depth_score,
                depth_label=depth_label,
            )
        )

    detections.sort(key=lambda d: d.confidence, reverse=True)

    return InferenceResponse(
        image_width=width,
        image_height=height,
        detections=detections,
        model_version=Path(settings.inference_model_path).stem,
    )
