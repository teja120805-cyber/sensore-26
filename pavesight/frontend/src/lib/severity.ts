import type { DepthLabel, Detection, DetectionStatus, Severity } from "../types";

// The backend only knows 3 severity levels. "Critical" is a purely
// presentational escalation of `high` severity detections above a confidence
// threshold, computed client-side - it is never sent to or read from the API.
export type Tier = "critical" | "high" | "medium" | "low";

export const TIERS: Tier[] = ["critical", "high", "medium", "low"];

export const TIER_COLORS: Record<Tier, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

export const TIER_BADGE_CLASSES: Record<Tier, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: TIER_COLORS.low,
  medium: TIER_COLORS.medium,
  high: TIER_COLORS.high,
};

export const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  low: TIER_BADGE_CLASSES.low,
  medium: TIER_BADGE_CLASSES.medium,
  high: TIER_BADGE_CLASSES.high,
};

export const STATUS_BADGE_CLASSES: Record<DetectionStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  repaired: "bg-green-100 text-green-700 border-green-200",
};

export const DEPTH_BADGE_CLASSES: Record<DepthLabel, string> = {
  shallow: "bg-green-100 text-green-700 border-green-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  deep: "bg-red-100 text-red-700 border-red-200",
  unknown: "bg-slate-100 text-slate-500 border-slate-200",
};

export const HEATMAP_GRADIENT: Record<number, string> = {
  0.2: TIER_COLORS.low,
  0.5: TIER_COLORS.medium,
  0.8: TIER_COLORS.high,
  1.0: TIER_COLORS.critical,
};

const CRITICAL_CONFIDENCE_THRESHOLD = 0.85;

export function getTier(d: Pick<Detection, "severity" | "confidence">): Tier {
  if (d.severity === "high" && d.confidence >= CRITICAL_CONFIDENCE_THRESHOLD) {
    return "critical";
  }
  return d.severity;
}

export function tierLabel(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function depthLabelText(label: DepthLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function defectLabel(defectClass: string): string {
  return defectClass
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
