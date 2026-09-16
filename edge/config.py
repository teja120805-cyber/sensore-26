"""
PaveSight edge pipeline configuration.

Edit the values below to match your hardware. Two things are PLACEHOLDERS
until the Pixhawk/MAVLink GPS + altitude integration lands (see geo.py):
CAMERA_HEIGHT_M and the DEFAULT_LAT/DEFAULT_LON fallback used for every
detection in the meantime.
"""

# --- Model ---
MODEL_PATH = "models/pothole_yolov8n.pt"   # path to your trained YOLOv8 .pt weights
CONFIDENCE_THRESHOLD = 0.5                  # ignore detections below this confidence
POTHOLE_CLASS_NAMES = ["pothole"]           # class name(s) in your model that count as a defect

# --- Camera ---
CAMERA_INDEX = 0                # /dev/video0 on the Pi; run `ls /dev/video*` to confirm
FRAME_WIDTH_PX = 1280
FRAME_HEIGHT_PX = 720

# --- Ground Sample Distance (GSD) calibration ---
# GSD (m/px) = (height_m * sensor_width_mm) / (focal_length_mm * frame_width_px)
# Look these up on your webcam's datasheet, or calibrate empirically — see
# "Calibrating without datasheet specs" in README.md.
SENSOR_WIDTH_MM = 3.6            # placeholder — replace with your webcam's actual sensor width
FOCAL_LENGTH_MM = 3.6            # placeholder — replace with your webcam's actual focal length
CAMERA_HEIGHT_M = 1.2            # PLACEHOLDER fixed mounting height until Pixhawk altitude is wired in

# --- Severity thresholds ---
# Must match the backend / architecture doc exactly — do not change independently.
SEVERITY_LOW_MAX_M2 = 0.05
SEVERITY_MEDIUM_MAX_M2 = 0.25

# --- GPS (placeholder until Pixhawk/MAVLink integration) ---
# geo.py currently returns this fixed point for every detection. Replace
# get_position() with a pymavlink read once the Pixhawk GPS module is wired up
# (instructions are in geo.py's docstring).
DEFAULT_LAT = 12.971599
DEFAULT_LON = 77.594566

# --- Detection de-duplication ---
DETECTION_COOLDOWN_SECONDS = 5   # don't re-report the same pothole every frame while it's in view

# --- Backend ---
BACKEND_URL = "http://192.168.1.50:8000/api/v1/detections"  # replace with the laptop's LAN IP running the backend
REQUEST_TIMEOUT_SECONDS = 5
OFFLINE_QUEUE_PATH = "offline_queue.jsonl"   # detections saved here if the backend is unreachable, retried automatically

# --- Local storage ---
SAVE_LOCAL_IMAGES = True
LOCAL_IMAGE_DIR = "captures"
