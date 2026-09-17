import { X } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge, TierBadge } from "../StatusBadge";
import { formatDateTime } from "../../lib/format";
import { defectLabel, getTier } from "../../lib/severity";
import type { Detection } from "../../types";

export default function DetectionDetailModal({
  detection,
  onClose,
}: {
  detection: Detection;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Detection #{detection.id}</h2>
            <p className="text-xs text-slate-400">{formatDateTime(detection.reported_at)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {detection.image_url && (
          <img
            src={detection.image_url}
            alt={detection.defect_class}
            className="mb-4 h-56 w-full rounded-lg object-cover"
          />
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Type" value={defectLabel(detection.defect_class)} />
          <Field label="Severity" value={<TierBadge tier={getTier(detection)} />} />
          <Field label="Confidence" value={`${Math.round(detection.confidence * 100)}%`} />
          <Field label="Status" value={<StatusBadge status={detection.status} />} />
          <Field label="Latitude" value={detection.lat.toFixed(6)} />
          <Field label="Longitude" value={detection.lon.toFixed(6)} />
          {detection.altitude_m != null && (
            <Field label="Altitude" value={`${detection.altitude_m.toFixed(1)} m`} />
          )}
          {detection.area_m2 != null && (
            <Field label="Area" value={`${detection.area_m2.toFixed(3)} m²`} />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-0.5 text-slate-700">{value}</div>
    </div>
  );
}
