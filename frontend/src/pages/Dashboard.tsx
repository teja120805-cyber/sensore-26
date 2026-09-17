import { AlertTriangle, GitBranch, MapPin, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Map from "../components/Map";
import MapLegend from "../components/map/MapLegend";
import { TierBadge } from "../components/StatusBadge";
import Card, { CardHeader } from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { timeAgo } from "../lib/format";
import { defectLabel, getTier } from "../lib/severity";
import type { Detection, StatsResponse } from "../types";

const MAP_CENTER: [number, number] = [12.9384, 77.6408];

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getStats(), api.listDetections({ limit: 200 })])
      .then(([statsRes, detectionsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setDetections(detectionsRes.items);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const potholes = detections.filter((d) => d.defect_class === "pothole").length;
  const cracks = detections.filter((d) => d.defect_class === "crack").length;
  const highPriority = detections.filter(
    (d) => d.status !== "repaired" && (getTier(d) === "critical" || getTier(d) === "high")
  ).length;
  const recent = detections.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of detected road damages and system status"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          value={loading ? "—" : potholes}
          label="Potholes Detected"
        />
        <StatCard
          icon={GitBranch}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          value={loading ? "—" : cracks}
          label="Cracks Detected"
        />
        <StatCard
          icon={MapPin}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          value={loading ? "—" : stats?.total ?? 0}
          label="Road Segments Scanned"
        />
        <StatCard
          icon={Wrench}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          value={loading ? "—" : highPriority}
          label="High Priority Repairs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Road Condition Map (Recent Detections)"
            action={
              <Link to="/map" className="text-xs font-semibold text-blue-600 hover:underline">
                View Full Map &rarr;
              </Link>
            }
          />
          <div className="relative h-80 overflow-hidden rounded-lg border border-slate-100">
            <Map
              center={MAP_CENTER}
              zoom={11}
              viewMode="markers"
              detections={detections}
              heatmapData={null}
              scrollWheelZoom={false}
            />
            <MapLegend />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent Detections"
            action={
              <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:underline">
                View All
              </Link>
            }
          />
          {loading && <p className="text-sm text-slate-400">Loading...</p>}
          {!loading && recent.length === 0 && (
            <p className="text-sm text-slate-400">No detections yet.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {recent.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {d.image_url && (
                    <img src={d.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {defectLabel(d.defect_class)}
                    </span>
                    <TierBadge tier={getTier(d)} />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">
                      {d.lat.toFixed(4)}, {d.lon.toFixed(4)}
                    </span>
                    <span>{timeAgo(d.reported_at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
