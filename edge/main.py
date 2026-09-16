"""
PaveSight edge pipeline — Raspberry Pi + USB webcam.

Captures frames, runs pothole detection, computes severity via the GSD
formula, tags each detection with a position (PLACEHOLDER until Pixhawk GPS
is wired in — see geo.py), and POSTs it to the backend.

Run from the parent directory of edge/:
    python -m edge.main
"""

import base64
import os
import time
from datetime import datetime, timezone

import cv2

from . import config
from .detector import PotholeDetector
from .geo import get_position
from .severity import bbox_area_m2, classify_severity
from .uploader import flush_offline_queue, send_detection


def encode_crop_base64(frame, bbox_px) -> str:
    x1, y1, x2, y2 = [int(v) for v in bbox_px]
    crop = frame[max(0, y1):y2, max(0, x1):x2]
    success, buffer = cv2.imencode(".jpg", crop)
    if not success:
        return ""
    return base64.b64encode(buffer).decode("utf-8")


def build_payload(frame, detection, lat, lon, altitude_m) -> dict:
    area_m2 = bbox_area_m2(detection["bbox"], altitude_m)
    severity = classify_severity(area_m2)
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": lat,
        "lon": lon,
        "altitude_m": altitude_m,
        "severity": severity,
        "confidence": round(detection["confidence"], 3),
        "area_m2": round(area_m2, 4),
        "defect_class": detection["class_name"],
        "image_base64": encode_crop_base64(frame, detection["bbox"]),
    }


def main():
    if config.SAVE_LOCAL_IMAGES:
        os.makedirs(config.LOCAL_IMAGE_DIR, exist_ok=True)

    cap = cv2.VideoCapture(config.CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH_PX)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT_PX)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera at index {config.CAMERA_INDEX}")

    detector = PotholeDetector()
    last_report_time = 0.0

    print("PaveSight edge pipeline running. Press Ctrl+C to stop.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("[main] frame grab failed, retrying...")
                time.sleep(0.5)
                continue

            flush_offline_queue()

            detections = detector.detect(frame)
            now = time.time()
            if detections and (now - last_report_time) >= config.DETECTION_COOLDOWN_SECONDS:
                position = get_position()
                if position is None:
                    print("[main] no GPS fix yet, skipping this detection")
                else:
                    lat, lon, altitude_m = position
                    best = max(detections, key=lambda d: d["confidence"])
                    payload = build_payload(frame, best, lat, lon, altitude_m)

                    if config.SAVE_LOCAL_IMAGES:
                        ts = payload["timestamp"].replace(":", "-")
                        cv2.imwrite(f"{config.LOCAL_IMAGE_DIR}/{ts}.jpg", frame)

                    send_detection(payload)
                    last_report_time = now

    except KeyboardInterrupt:
        print("Stopping.")
    finally:
        cap.release()


if __name__ == "__main__":
    main()
