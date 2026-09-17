import { Camera, ImageUp, Loader2, MapPin, Video as VideoIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { DepthBadge, TierBadge } from "../components/StatusBadge";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { defectLabel, getTier, TIER_COLORS } from "../lib/severity";
import type { InferenceDetectionBox } from "../types";

type SourceTab = "upload" | "camera" | "video";
const DEFAULT_LOCATION = { lat: 12.9384, lon: 77.6408 };

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LiveDetection() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SourceTab>("upload");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [frameDims, setFrameDims] = useState<{ width: number; height: number } | null>(null);
  const [detections, setDetections] = useState<InferenceDetectionBox[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationIsDevice, setLocationIsDevice] = useState(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationIsDevice(true);
      },
      () => setLocationIsDevice(false),
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Could not access camera - check browser permissions."
      );
    }
  }

  function selectTab(next: SourceTab) {
    if (tab === "camera" && next !== "camera") stopCamera();
    setTab(next);
    setSubmitMessage(null);
  }

  async function runDetection(dataUrl: string, dims: { width: number; height: number } | null) {
    setImageDataUrl(dataUrl);
    setFrameDims(dims);
    setDetections(null);
    setDetectError(null);
    setSubmitMessage(null);
    setDetecting(true);
    try {
      const blob = await dataUrlToBlob(dataUrl);
      const res = await api.detectImage(blob);
      setFrameDims({ width: res.image_width, height: res.image_height });
      setDetections(res.detections);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setDetectError("Detection model isn't loaded on the server yet.");
      } else {
        setDetectError(err instanceof Error ? err.message : "Detection request failed.");
      }
    } finally {
      setDetecting(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataUrl(file);
    runDetection(dataUrl, null);
  }

  function handleVideoFile(file: File | null) {
    if (!file || !uploadedVideoRef.current) return;
    uploadedVideoRef.current.src = URL.createObjectURL(file);
  }

  function captureFromVideo(video: HTMLVideoElement | null) {
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    runDetection(canvas.toDataURL("image/jpeg", 0.9), { width: canvas.width, height: canvas.height });
    stopCamera();
  }

  async function handleLogToReports() {
    if (!top || !imageDataUrl) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      await api.ingestDetection({
        timestamp: new Date().toISOString(),
        lat: location.lat,
        lon: location.lon,
        severity: top.severity,
        confidence: top.confidence,
        defect_class: top.class_name,
        image_base64: imageDataUrl.split(",")[1] ?? undefined,
      });
      setSubmitMessage({ ok: true, text: "Detection logged to Reports." });
    } catch (err) {
      setSubmitMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to log detection.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const top = detections && detections.length > 0 ? detections[0] : null;
  const tier = top ? getTier({ severity: top.severity, confidence: top.confidence }) : null;
  const aspectRatio = frameDims ? `${frameDims.width} / ${frameDims.height}` : "4 / 3";

  return (
    <div>
      <PageHeader
        title="Live Detection"
        subtitle="Upload an image or use live camera to detect potholes and road defects"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <TabButton icon={ImageUp} label="Upload Image" active={tab === "upload"} onClick={() => selectTab("upload")} />
            <TabButton icon={Camera} label="Live Camera" active={tab === "camera"} onClick={() => selectTab("camera")} />
            <TabButton icon={VideoIcon} label="Video" active={tab === "video"} onClick={() => selectTab("video")} />
          </div>

          {tab === "upload" && (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`relative flex max-h-96 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center transition-colors ${
                dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"
              }`}
              style={{ aspectRatio }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {imageDataUrl ? (
                <DetectionCanvas
                  src={imageDataUrl}
                  detections={detections}
                  detecting={detecting}
                  frameDims={frameDims}
                />
              ) : (
                <>
                  <ImageUp size={32} className="mb-2 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">Upload Image</p>
                  <p className="text-xs text-slate-400">or drag and drop here</p>
                </>
              )}
            </label>
          )}

          {tab === "camera" && (
            <div
              className="relative flex max-h-96 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
              style={{ aspectRatio: imageDataUrl && !cameraActive ? aspectRatio : "16 / 10" }}
            >
              {/* Always mounted (never conditionally rendered) so videoRef.current
                  is already valid the moment startCamera() tries to attach the
                  stream - visibility is toggled instead of mount/unmount. */}
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-full w-full object-cover"
                hidden={!cameraActive}
              />
              {imageDataUrl && !cameraActive && (
                <div className="absolute inset-0">
                  <DetectionCanvas
                    src={imageDataUrl}
                    detections={detections}
                    detecting={detecting}
                    frameDims={frameDims}
                  />
                </div>
              )}
              {!cameraActive && !imageDataUrl && (
                <div className="text-center text-sm text-slate-300">
                  <Camera size={28} className="mx-auto mb-2" />
                  {cameraError ?? "Camera is off"}
                </div>
              )}
            </div>
          )}
          {tab === "camera" && (
            <div className="mt-3 flex gap-2">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={() => captureFromVideo(videoRef.current)}
                    className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Capture &amp; Detect
                  </button>
                  <button
                    onClick={stopCamera}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "video" && (
            <div
              className="flex max-h-96 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
              style={{ aspectRatio: imageDataUrl ? aspectRatio : "16 / 10" }}
            >
              {imageDataUrl ? (
                <DetectionCanvas
                  src={imageDataUrl}
                  detections={detections}
                  detecting={detecting}
                  frameDims={frameDims}
                />
              ) : (
                <video
                  ref={uploadedVideoRef}
                  controls
                  className="max-h-full max-w-full"
                  onLoadedData={() => {
                    setImageDataUrl(null);
                    setDetections(null);
                  }}
                />
              )}
            </div>
          )}
          {tab === "video" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Choose Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleVideoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                onClick={() => captureFromVideo(uploadedVideoRef.current)}
                className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Capture Frame &amp; Detect
              </button>
              {imageDataUrl && (
                <button
                  onClick={() => {
                    setImageDataUrl(null);
                    setDetections(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Back to Video
                </button>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Supports JPG, PNG, MP4 (Max 15MB per frame) &middot; served by a YOLOv8 model fine-tuned
            on a road-damage dataset
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold text-slate-700">Detection Results</h2>
          {!imageDataUrl && (
            <p className="text-sm text-slate-400">
              Run a detection from an uploaded image, the live camera, or a video frame to see
              results here.
            </p>
          )}
          {detecting && <p className="text-sm text-slate-400">Running the model...</p>}
          {detectError && <p className="text-sm text-red-600">{detectError}</p>}
          {!detecting && detections && detections.length === 0 && (
            <p className="text-sm text-slate-400">No road defects detected in this frame.</p>
          )}

          {!detecting && top && tier && (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Confidence</span>
                  <span className="font-semibold text-slate-700">
                    {(top.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${top.confidence * 100}%` }}
                  />
                </div>
              </div>

              <DetailRow label="Type" value={defectLabel(top.class_name)} />
              <DetailRow label="Severity" value={<TierBadge tier={tier} />} />
              <DetailRow
                label="Latitude"
                value={`${location.lat.toFixed(4)}° ${location.lat >= 0 ? "N" : "S"}`}
              />
              <DetailRow
                label="Longitude"
                value={`${location.lon.toFixed(4)}° ${location.lon >= 0 ? "E" : "W"}`}
              />
              <DetailRow label="Frame Coverage" value={`${(top.area_fraction * 100).toFixed(1)}%`} />
              <DetailRow label="Estimated Depth" value={<DepthBadge label={top.depth_label} />} />
              <p className="text-[11px] text-slate-400">
                Depth is a relative shadow-based estimate, not a physical measurement.
              </p>
              {detections && detections.length > 1 && (
                <p className="text-[11px] text-slate-400">
                  +{detections.length - 1} more defect{detections.length - 1 === 1 ? "" : "s"}{" "}
                  detected in this frame.
                </p>
              )}
              {!locationIsDevice && (
                <p className="text-[11px] text-slate-400">
                  Using default location - allow browser location access for on-site coordinates.
                </p>
              )}

              <button
                onClick={handleLogToReports}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Log to Reports
              </button>
              {submitMessage && (
                <p className={`text-xs ${submitMessage.ok ? "text-green-600" : "text-red-600"}`}>
                  {submitMessage.text}
                </p>
              )}

              <button
                onClick={() => navigate("/map", { state: { flyTo: { lat: location.lat, lon: location.lon } } })}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <MapPin size={14} /> View on Map
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function DetectionCanvas({
  src,
  detections,
  detecting,
  frameDims,
}: {
  src: string;
  detections: InferenceDetectionBox[] | null;
  detecting: boolean;
  frameDims: { width: number; height: number } | null;
}) {
  return (
    <div className="relative h-full w-full">
      <img src={src} alt="Captured frame" className="h-full w-full object-cover" />
      {detecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
      )}
      {/* Boxes come back in the original frame's pixel space (frameDims), and the
          preview container's aspect-ratio is set to match that frame exactly, so
          percentage-of-container == percentage-of-frame with no letterboxing. */}
      {frameDims &&
        detections?.map((d, i) => {
          const color = TIER_COLORS[getTier({ severity: d.severity, confidence: d.confidence })];
          const leftPct = (d.x1 / frameDims.width) * 100;
          const topPct = (d.y1 / frameDims.height) * 100;
          const widthPct = ((d.x2 - d.x1) / frameDims.width) * 100;
          const heightPct = ((d.y2 - d.y1) / frameDims.height) * 100;
          return (
            <div
              key={i}
              className="absolute border-2"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                borderColor: color,
              }}
            >
              <span
                className="absolute left-0 top-0 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {defectLabel(d.class_name)} {d.confidence.toFixed(2)}
              </span>
            </div>
          );
        })}
    </div>
  );
}
