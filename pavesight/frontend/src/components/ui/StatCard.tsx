import type { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  sublabel,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight text-slate-800">{value}</div>
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
        {sublabel && <div className="mt-0.5 text-[11px] text-slate-400">{sublabel}</div>}
      </div>
    </div>
  );
}
