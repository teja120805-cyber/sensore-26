"""Integration test: POST a detection, then GET it back (list + detail).

Requires a live Postgres+PostGIS instance reachable via DATABASE_URL
(e.g. `docker compose up db` or the full `docker compose up`).
"""
from datetime import datetime, timezone


def test_ingest_then_list_and_get_roundtrip(client):
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": 12.971599,
        "lon": 77.594566,
        "altitude_m": 12.4,
        "severity": "medium",
        "confidence": 0.83,
        "area_m2": 0.14,
        "defect_class": "pothole",
    }

    post_resp = client.post("/api/v1/detections", json=payload)
    assert post_resp.status_code == 201
    created = post_resp.json()
    assert created["severity"] == "medium"
    assert created["status"] == "pending"
    assert abs(created["lat"] - payload["lat"]) < 1e-6
    assert abs(created["lon"] - payload["lon"]) < 1e-6

    detection_id = created["id"]

    get_resp = client.get(f"/api/v1/detections/{detection_id}")
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["id"] == detection_id
    assert fetched["defect_class"] == "pothole"

    list_resp = client.get("/api/v1/detections", params={"severity": ["medium"]})
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert body["total"] >= 1
    assert any(item["id"] == detection_id for item in body["items"])


def test_get_unknown_detection_returns_404(client):
    resp = client.get("/api/v1/detections/999999999")
    assert resp.status_code == 404


def test_patch_requires_auth(client):
    resp = client.patch("/api/v1/detections/1", json={"status": "repaired"})
    assert resp.status_code == 401
