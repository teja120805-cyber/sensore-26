"""
Sends a detection payload to the PaveSight backend, with a simple on-disk
retry queue if the backend is unreachable (e.g. the Pi briefly drops WiFi,
or the laptop running the backend isn't up yet).
"""

import json
import os

import requests

from . import config


def _post(payload: dict) -> bool:
    try:
        resp = requests.post(
            config.BACKEND_URL, json=payload, timeout=config.REQUEST_TIMEOUT_SECONDS
        )
        return resp.status_code in (200, 201)
    except requests.RequestException:
        return False


def _append_to_offline_queue(payload: dict):
    with open(config.OFFLINE_QUEUE_PATH, "a") as f:
        f.write(json.dumps(payload) + "\n")


def flush_offline_queue():
    """Call this once per loop iteration to retry anything queued while the backend was down."""
    if not os.path.exists(config.OFFLINE_QUEUE_PATH):
        return
    with open(config.OFFLINE_QUEUE_PATH, "r") as f:
        lines = f.readlines()
    if not lines:
        return

    remaining = []
    for line in lines:
        payload = json.loads(line)
        if not _post(payload):
            remaining.append(line)
    with open(config.OFFLINE_QUEUE_PATH, "w") as f:
        f.writelines(remaining)

    if len(remaining) < len(lines):
        print(f"[uploader] flushed {len(lines) - len(remaining)} queued detection(s)")


def send_detection(payload: dict):
    """Attempts to POST immediately; falls back to the offline queue on failure."""
    if _post(payload):
        print("[uploader] detection uploaded")
    else:
        print("[uploader] backend unreachable, queuing detection for retry")
        _append_to_offline_queue(payload)
