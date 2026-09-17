import type { DepthLabel, DetectionStatus, Severity } from "../types";
import {
  DEPTH_BADGE_CLASSES,
  depthLabelText,
  SEVERITY_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  TIER_BADGE_CLASSES,
  Tier,
  tierLabel,
} from "../lib/severity";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_BADGE_CLASSES[severity]}`}
    >
      {severity}
    </span>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_BADGE_CLASSES[tier]}`}
    >
      {tierLabel(tier)}
    </span>
  );
}

export function DepthBadge({ label }: { label: DepthLabel }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${DEPTH_BADGE_CLASSES[label]}`}
    >
      {depthLabelText(label)}
    </span>
  );
}

export function StatusBadge({ status }: { status: DetectionStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}
