"""Unit tests for the pure priority-scoring functions (no DB required)."""
import math

from app.services.priority import (
    ScoredDetection,
    cluster_score,
    decay,
    detection_contribution,
    severity_weight,
)

HALF_LIFE = 30.0


def test_severity_weights():
    assert severity_weight("low") == 1.0
    assert severity_weight("medium") == 3.0
    assert severity_weight("high") == 6.0


def test_decay_is_one_at_zero_age():
    assert decay(0, HALF_LIFE) == 1.0


def test_decay_is_half_at_one_half_life():
    assert math.isclose(decay(HALF_LIFE, HALF_LIFE), 0.5, rel_tol=1e-9)


def test_decay_is_quarter_at_two_half_lives():
    assert math.isclose(decay(2 * HALF_LIFE, HALF_LIFE), 0.25, rel_tol=1e-9)


def test_decay_decreases_monotonically_with_age():
    ages = [0, 5, 10, 20, 30, 60, 90]
    values = [decay(a, HALF_LIFE) for a in ages]
    assert values == sorted(values, reverse=True)
    assert all(0 < v <= 1 for v in values)


def test_confidence_scales_contribution_linearly():
    low_conf = detection_contribution(ScoredDetection(id=1, severity="medium", confidence=0.4, age_days=0))
    high_conf = detection_contribution(ScoredDetection(id=2, severity="medium", confidence=0.8, age_days=0))
    assert math.isclose(high_conf, 2 * low_conf, rel_tol=1e-9)


def test_single_high_severity_recent_beats_many_old_low_severity():
    single_high_recent = [ScoredDetection(id=1, severity="high", confidence=0.9, age_days=0)]

    many_old_low = [
        ScoredDetection(id=i, severity="low", confidence=0.9, age_days=90)
        for i in range(2, 6)
    ]

    assert cluster_score(single_high_recent) > cluster_score(many_old_low)


def test_cluster_score_is_sum_of_contributions():
    detections = [
        ScoredDetection(id=1, severity="low", confidence=0.6, age_days=10),
        ScoredDetection(id=2, severity="high", confidence=0.9, age_days=5),
    ]
    expected = sum(detection_contribution(d) for d in detections)
    assert math.isclose(cluster_score(detections), expected, rel_tol=1e-9)


def test_older_detection_scores_lower_than_identical_recent_one():
    recent = ScoredDetection(id=1, severity="medium", confidence=0.7, age_days=1)
    old = ScoredDetection(id=2, severity="medium", confidence=0.7, age_days=45)
    assert detection_contribution(recent) > detection_contribution(old)
