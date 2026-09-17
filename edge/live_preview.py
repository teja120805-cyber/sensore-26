import cv2
from flask import Flask, Response
from ultralytics import YOLO

import config

app = Flask(__name__)
cap = cv2.VideoCapture(config.CAMERA_INDEX)
model = YOLO(config.MODEL_PATH)

def gen_frames():
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        results = model.predict(frame, conf=0.25, verbose=False)
        annotated = results[0].plot()  # draws boxes + labels + confidence

        _, buffer = cv2.imencode('.jpg', annotated)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.route('/')
def video():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)