import { useState, type ReactNode } from "react";
import Card, { CardHeader } from "../ui/Card";

export type SeverityOption = "all" | "critical" | "high" | "medium" | "low";
export type StatusOption = "all" | "pending" | "scheduled" | "repaired";
export type DateRangeOption = "all" | "7" | "30" | "90";

export interface MapFilterState {
  severity: SeverityOption;
  status: StatusOption;
  dateRange: DateRangeOption;
}

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  severity: "all",
  status: "all",
  dateRange: "30",
};

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export default function MapFilterPanel({
  initial,
  onApply,
}: {
  initial: MapFilterState;
  onApply: (filters: MapFilterState) => void;
}) {
  const [draft, setDraft] = useState<MapFilterState>(initial);

  return (
    <Card>
      <CardHeader title="Filter" />
      <div className="space-y-4">
        <Field label="Severity">
          <select
            className={selectClass}
            value={draft.severity}
            onChange={(e) => setDraft((f) => ({ ...f, severity: e.target.value as SeverityOption }))}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            className={selectClass}
            value={draft.status}
            onChange={(e) => setDraft((f) => ({ ...f, status: e.target.value as StatusOption }))}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="repaired">Repaired</option>
          </select>
        </Field>

        <Field label="Date Range">
          <select
            className={selectClass}
            value={draft.dateRange}
            onChange={(e) => setDraft((f) => ({ ...f, dateRange: e.target.value as DateRangeOption }))}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </Field>

        <button
          onClick={() => onApply(draft)}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Apply
        </button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
