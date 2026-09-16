# PaveSight Edge Pipeline (Raspberry Pi + USB webcam)

Captures webcam frames on the Pi, runs your trained YOLOv8 pothole-detection
model, computes a severity score from the bounding box, tags the detection
with a position, and POSTs it to the PaveSight backend
(`POST /api/v1/detections`, matching `web-app-build-prompt.md`'s schema exactly).

## Current placeholders (by design, not bugs)

- **GPS/altitude**: `edge/geo.py` returns a fixed lat/lon/height from
  `edge/config.py` for every detection. Your Pixhawk's GPS module isn't
  integrated yet — `geo.py`'s docstring has the exact pymavlink code to drop
  in once it is. Nothing else in the pipeline needs to change when you do.
- **Camera intrinsics**: `SENSOR_WIDTH_MM` / `FOCAL_LENGTH_MM` in
  `edge/config.py` are placeholder values for a generic webcam. See
  "Calibrating without datasheet specs" below.

## Setup on the Pi

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Drop your trained weights at `models/pothole_yolov8n.pt` (or update
`MODEL_PATH` in `edge/config.py` to point elsewhere).

Edit `edge/config.py`:
- `CAMERA_INDEX` — confirm with `ls /dev/video*`
- `BACKEND_URL` — the LAN IP of the laptop running the backend, e.g.
  `http://192.168.1.50:8000/api/v1/detections` (find it with `ipconfig` on
  the laptop; make sure the Pi and laptop are on the same WiFi network and
  the backend's Docker Compose port 8000 is exposed, not just bound to
  localhost)

## Run it

```bash
python -m edge.main
```

You should see `[uploader] detection uploaded` in the console each time a
pothole is detected and successfully sent. If the backend is unreachable,
detections are queued to `offline_queue.jsonl` and retried automatically
once it's back.

## Run it on boot (optional, for a live demo)

```bash
sudo cp systemd/pavesight-edge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pavesight-edge
journalctl -u pavesight-edge -f   # watch logs
```

Update the `WorkingDirectory` path in the service file first if you didn't
clone this to `/home/pi/pavesight-edge`.

## Calibrating without datasheet specs

If you don't know your webcam's exact sensor width / focal length:

1. Place an object of known width (e.g. a ruler, 0.30 m) flat on the ground.
2. Mount the camera at your real `CAMERA_HEIGHT_M` and capture a frame.
3. Measure the object's width in pixels in that frame.
4. Compute meters-per-pixel directly: `known_width_m / width_px`.
5. Back out an equivalent `SENSOR_WIDTH_MM` so
   `ground_sample_distance_m_per_px()` in `edge/severity.py` reproduces that
   value — or simplest: replace that function's body with your measured
   meters-per-pixel constant divided by `CAMERA_HEIGHT_M` and scale linearly
   with height. Either way, re-measure if you change camera height.

## Testing against the backend without a Pi

You can validate the payload shape hits the backend correctly with `curl`,
using the same JSON shape `main.py` builds:

```bash
curl -X POST http://<backend-ip>:8000/api/v1/detections \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-09-16T10:42:11Z",
    "lat": 12.971599,
    "lon": 77.594566,
    "altitude_m": 1.2,
    "severity": "medium",
    "confidence": 0.83,
    "area_m2": 0.14,
    "defect_class": "pothole",
    "image_base64": ""
  }'
```

## Performance note (Raspberry Pi 4)

`ultralytics` pulls in PyTorch, which is heavy for a Pi 4's CPU. YOLOv8n
should still run at a few FPS, enough for a walking-pace or slow-vehicle
demo. If you need more speed, export your model to ONNX
(`model.export(format="onnx")` from ultralytics) and swap `detector.py` to
run inference via `cv2.dnn.readNetFromONNX` instead — same interface, no
PyTorch dependency, noticeably faster on Pi CPUs.

## Not in scope here

- MAVLink/Pixhawk GPS integration (placeholder in `geo.py`, wire in when the
  GPS module is ready)
- Any drone flight logic — this assumes a Pi + webcam set up for detection
  only, matching how you described this pass
