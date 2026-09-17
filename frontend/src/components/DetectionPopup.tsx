import type { Detection } from "../types";
import { defectLabel, getTier } from "../lib/severity";
import { timeAgo } from "../lib/format";
import { StatusBadge, TierBadge } from "./StatusBadge";

export default function DetectionPopup({ detection }: { detection: Detection }) {
  return (
    <div className="w-56 space-y-2">
      {detection.image_url && (
        <img
          src={detection.image_url}
          alt={detection.defect_class}
          className="h-28 w-full rounded object-cover"
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{defectLabel(detection.defect_class)}</span>
        <TierBadge tier={getTier(detection)} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{Math.round(detection.confidence * 100)}% confidence</span>
        <StatusBadge status={detection.status} />
      </div>
      <div className="text-xs text-gray-500">{timeAgo(detection.reported_at)}</div>
    </div>
  );
}
