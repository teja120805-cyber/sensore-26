import { TIER_COLORS, TIERS, tierLabel } from "../../lib/severity";

export default function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex gap-3 rounded-md bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow">
      {TIERS.map((tier) => (
        <span key={tier} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TIER_COLORS[tier] }}
          />
          {tierLabel(tier)}
        </span>
      ))}
    </div>
  );
}
