"""
Loads the trained YOLOv8 pothole-detection model and runs inference on frames.
"""

from ultralytics import YOLO

from . import config


class PotholeDetector:
    def __init__(self, model_path: str = config.MODEL_PATH):
        self.model = YOLO(model_path)

    def detect(self, frame):
        """
        Runs inference on a single BGR frame (as returned by cv2.VideoCapture).

        Returns a list of dicts:
            {"bbox": (x1, y1, x2, y2), "confidence": float, "class_name": str}

        Only returns detections at/above config.CONFIDENCE_THRESHOLD whose
        class name is in config.POTHOLE_CLASS_NAMES.
        """
        results = self.model.predict(
            frame, conf=config.CONFIDENCE_THRESHOLD, verbose=False
        )
        detections = []
        for result in results:
            names = result.names
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = names[class_id]
                if class_name not in config.POTHOLE_CLASS_NAMES:
                    continue
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                detections.append(
                    {
                        "bbox": (x1, y1, x2, y2),
                        "confidence": confidence,
                        "class_name": class_name,
                    }
                )
        return detections
