import { Download, Eye, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DetectionDetailModal from "../components/reports/DetectionDetailModal";
import { StatusBadge, TierBadge } from "../components/StatusBadge";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { defectLabel, getTier } from "../lib/severity";
import type { Detection, DetectionFilters, DetectionStatus } from "../types";

const PAGE_SIZE = 10;
const TABS = [
  { key: "all", label: "All Reports" },
  { key: "pending", label: "Pending" },
  { key: "scheduled", label: "Scheduled" },
  { key: "repaired", label: "Repaired" },
];
const STATUS_OPTIONS: DetectionStatus[] = ["pending", "scheduled", "repaired"];

function toCsv(rows: Detection[]): string {
  const header = ["id", "reported_at", "defect_class", "severity", "confidence", "lat", "lon", "status"];
  const lines = rows.map((d) =>
    [d.id, d.reported_at, d.defect_class, d.severity, d.confidence, d.lat, d.lon, d.status].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export default function Reports() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Detection | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: DetectionFilters = { limit: PAGE_SIZE, offset };
      if (tab !== "all") filters.status = [tab as DetectionStatus];
      const res = await api.listDetections(filters);
      setDetections(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [tab, offset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setOffset(0);
  }, [tab]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return detections;
    return detections.filter(
      (d) =>
        defectLabel(d.defect_class).toLowerCase().includes(term) ||
        String(d.id).includes(term) ||
        `${d.lat}`.includes(term) ||
        `${d.lon}`.includes(term)
    );
  }, [detections, search]);

  async function handleStatusChange(id: number, status: DetectionStatus) {
    const previous = detections;
    setDetections((cur) => cur.map((d) => (d.id === id ? { ...d, status } : d)));
    setPendingIds((cur) => new Set(cur).add(id));
    try {
      await api.updateDetectionStatus(id, status);
    } catch (err) {
      setDetections(previous);
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setPendingIds((cur) => {
        const next = new Set(cur);
        next.delete(id);
        return next;
      });
    }
  }

  function handleExport() {
    const csv = toCsv(visible);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pavesight-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const page = Math.floor(offset / PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="View and manage all detected road damage reports"
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by type, id, lat/lon..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase text-slate-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Location (Lat, Lon)</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    Loading reports...
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    No reports match the current filters.
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((d) => (
                  <tr key={d.id} className={pendingIds.has(d.id) ? "opacity-50" : ""}>
                    <td className="px-4 py-2.5 text-slate-400">{d.id}</td>
                    <td className="px-4 py-2.5">
                      <div className="h-10 w-14 overflow-hidden rounded bg-slate-100">
                        {d.image_url && (
                          <img src={d.image_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{defectLabel(d.defect_class)}</td>
                    <td className="px-4 py-2.5">
                      <TierBadge tier={getTier(d)} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {d.lat.toFixed(4)}, {d.lon.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDateTime(d.reported_at)}</td>
                    <td className="px-4 py-2.5">
                      {isAuthenticated ? (
                        <select
                          className="rounded border border-slate-200 px-2 py-1 text-xs capitalize"
                          value={d.status}
                          disabled={pendingIds.has(d.id)}
                          onChange={(e) => handleStatusChange(d.id, e.target.value as DetectionStatus)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={d.status} />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setSelected(d)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page + 1} of {totalPages} &middot; {total} total
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            disabled={page + 1 >= totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      </div>

      {selected && <DetectionDetailModal detection={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
