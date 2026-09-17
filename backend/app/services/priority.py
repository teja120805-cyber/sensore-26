"""Priority scoring for clusters of road-defect detections.

PriorityScore(cluster) = sum_i [ weight(severity_i) * confidence_i * decay(age_i) ]

weight(low) = 1, weight(medium) = 3, weight(high) = 6
decay(age_days) = exp(-ln(2) * age_days / HALF_LIFE_DAYS)

Kept dependency-free (no DB, no FastAPI) so it can be unit tested directly.
"""
import math
from dataclasses import dataclass

from app.core.config import settings

HALF_LIFE_DAYS = settings.priority_half_life_days
SEVERITY_WEIGHTS: dict[str, float] = settings.priority_severity_weights


def severity_weight(severity: str) -> float:
    try:
        return SEVERITY_WEIGHTS[severity]
    except KeyError as exc:
        raise ValueError(f"Unknown severity: {severity!r}") from exc


def decay(age_days: float, half_life_days: float = HALF_LIFE_DAYS) -> float:
    """Exponential recency decay; 1.0 at age 0, 0.5 at one half-life."""
    return math.exp(-math.log(2) * age_days / half_life_days)


@dataclass(frozen=True)
class ScoredDetection:
    id: int
    severity: str
    confidence: float
    age_days: float


def detection_contribution(detection: ScoredDetection) -> float:
    return severity_weight(detection.severity) * detection.confidence * decay(detection.age_days)


def cluster_score(detections: list[ScoredDetection]) -> float:
    return sum(detection_contribution(d) for d in detections)


def dominant_severity(detections: list[ScoredDetection]) -> str:
    """Severity with the greatest total weighted contribution in the cluster."""
    totals: dict[str, float] = {"low": 0.0, "medium": 0.0, "high": 0.0}
    for d in detections:
        totals[d.severity] += detection_contribution(d)
    return max(totals, key=lambda s: totals[s])
