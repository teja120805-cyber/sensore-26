"""
Converts a YOLO bounding box into a real-world area estimate (via Ground
Sample Distance) and a severity label, using the same thresholds as the
backend / architecture doc. Do not change SEVERITY_LOW_MAX_M2 /
SEVERITY_MEDIUM_MAX_M2 here without also updating the backend — they must
match, since the backend trusts whatever severity the edge sends.
"""

from . import config


def ground_sample_distance_m_per_px(height_m: float) -> float:
    """
    GSD (m/px) = (height_m * sensor_width_mm) / (focal_length_mm * frame_width_px)
    """
    return (height_m * config.SENSOR_WIDTH_MM) / (
        config.FOCAL_LENGTH_MM * config.FRAME_WIDTH_PX
    )


def bbox_area_m2(bbox_px, height_m: float) -> float:
    """
    bbox_px: (x1, y1, x2, y2) in pixel coordinates.
    Returns the estimated real-world area of the bounding box in square meters.
    """
    x1, y1, x2, y2 = bbox_px
    width_px = max(0.0, x2 - x1)
    height_px = max(0.0, y2 - y1)

    gsd = ground_sample_distance_m_per_px(height_m)
    width_m = width_px * gsd
    box_height_m = height_px * gsd
    return width_m * box_height_m


def classify_severity(area_m2: float) -> str:
    if area_m2 < config.SEVERITY_LOW_MAX_M2:
        return "low"
    elif area_m2 < config.SEVERITY_MEDIUM_MAX_M2:
        return "medium"
    else:
        return "high"
