import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client";
import Map, { type FlyTarget, type ViewMode } from "../components/Map";
import DefectTypePills from "../components/map/DefectTypePills";
import MapFilterPanel, {
  DEFAULT_MAP_FILTERS,
  type MapFilterState,
} from "../components/map/MapFilterPanel";
import MapLegend from "../components/map/MapLegend";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { getTier, defectLabel } from "../lib/severity";
import { useSettings } from "../lib/settings";
import type { Detection, DetectionFilters, PriorityCluster, StatsResponse } from "../types";
import { CheckCircle2, Clock, ListChecks, Wrench } from "lucide-react";

const MAP_CENTER: [number, number] = [12.9384, 77.6408];
const DEFECT_OPTIONS = [
  { key: "all", label: "All" },
  { key: "pothole", label: "Pothole" },
  { key: "crack", label: "Crack" },
  { key: "rutting", label: "Rutting" },
  { key: "raveling", label: "Raveling" },
];

function toApiFilters(f: MapFilterState): DetectionFilters {
  const filters: DetectionFilters = { limit: 200 };
  if (f.severity === "critical" || f.severity === "high") filters.severity = ["high"];
  else if (f.severity === "medium" || f.severity === "low") filters.severity = [f.severity];

  if (f.status !== "all") filters.status = [f.status];

  if (f.dateRange !== "all") {
    const days = Number(f.dateRange);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    filters.date_from = from.toISOString();
  }
  return filters;
}

export default function MapViewPage() {
  const settings = useSettings();
  const routerLocation = useLocation();
  const flyState = (routerLocation.state as { flyTo?: { lat: number; lon: number } } | null)?.flyTo;

  const [viewMode, setViewMode] = useState<ViewMode>(settings.mapPrefs.defaultView);
  const [defectType, setDefectType] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<MapFilterState>(DEFAULT_MAP_FILTERS);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [clusters, setClusters] = useState<PriorityCluster[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(
    flyState ? { lat: flyState.lat, lon: flyState.lon, zoom: 17 } : null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = toApiFilters(appliedFilters);
      const [detectionsRes, clustersRes, statsRes] = await Promise.all([
        api.listDetections(apiFilters),
        api.getPriorityClusters(8),
        api.getStats(),
      ]);
      setDetections(detectionsRes.items);
      setClusters(clustersRes.clusters);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleDetections = useMemo(() => {
    return detections.filter((d) => {
      if (defectType !== "all" && d.defect_class !== defectType) return false;
      if (appliedFilters.severity === "critical" && getTier(d) !== "critical") return false;
      if (appliedFilters.severity === "high" && getTier(d) !== "high") return false;
      if (
        appliedFilters.status === "all" &&
        !settings.mapPrefs.showRepaired &&
        d.status === "repaired"
      ) {
        return false;
      }
      return true;
    });
  }, [detections, defectType, appliedFilters, settings.mapPrefs.showRepaired]);

  return (
    <div>
      <PageHeader
        title="Map View"
        subtitle="Explore road conditions across different areas"
        actions={
          <div className="flex gap-1.5 rounded-lg bg-slate-100 p-1">
            <ViewToggle label="Heatmap" active={viewMode === "heatmap"} onClick={() => setViewMode("heatmap")} />
            <ViewToggle label="Markers" active={viewMode === "markers"} onClick={() => setViewMode("markers")} />
          </div>
        }
      />

      <div className="mb-4">
        <DefectTypePills options={DEFECT_OPTIONS} active={defectType} onChange={setDefectType} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="relative h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-3">
          <Map
            center={MAP_CENTER}
            zoom={12}
            viewMode={viewMode}
            detections={visibleDetections}
            heatmapData={null}
            flyTarget={flyTarget}
            clusters={settings.mapPrefs.showClusterCircles ? clusters : undefined}
            className="h-full w-full rounded-xl"
          />
          <MapLegend />
          {loading && (
            <div className="absolute right-3 top-3 rounded-md bg-white/95 px-3 py-1 text-xs font-medium text-slate-500 shadow">
              Loading...
            </div>
          )}
        </div>

        <MapFilterPanel initial={appliedFilters} onApply={setAppliedFilters} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={ListChecks}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          value={stats?.total ?? "—"}
          label="Total Reports"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          value={stats?.by_status.pending ?? 0}
          label="Pending"
        />
        <StatCard
          icon={Wrench}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          value={stats?.by_status.scheduled ?? 0}
          label="Scheduled"
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          value={stats?.by_status.repaired ?? 0}
          label="Repaired"
        />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Showing {visibleDetections.length} of {detections.length} loaded detections
        {defectType !== "all" ? ` · filtered to ${defectLabel(defectType)}` : ""}.
      </p>
    </div>
  );
}

function ViewToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}
