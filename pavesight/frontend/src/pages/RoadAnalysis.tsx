import { AlertCircle, ClipboardList, MapPinned, TrendingUp, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import Card, { CardHeader } from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import Tabs from "../components/ui/Tabs";
import { formatDate } from "../lib/format";
import { defectLabel, getTier, TIER_COLORS, TIERS, tierLabel, type Tier } from "../lib/severity";
import type { Detection, PriorityCluster } from "../types";

type RangeDays = 7 | 30 | 90 | 9999;

const RANGE_OPTIONS: { key: RangeDays; label: string }[] = [
  { key: 7, label: "Last 7 Days" },
  { key: 30, label: "Last 30 Days" },
  { key: 90, label: "Last 90 Days" },
  { key: 9999, label: "All Time" },
];

const TABS = [
  { key: "damage-stats", label: "Damage Statistics" },
  { key: "severity-dist", label: "Severity Distribution" },
  { key: "road-wise", label: "Road-wise Analysis" },
  { key: "priority-rec", label: "Priority Recommendations" },
];

export default function RoadAnalysis() {
  const [tab, setTab] = useState(TABS[0].key);
  const [range, setRange] = useState<RangeDays>(30);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [clusters, setClusters] = useState<PriorityCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.listDetections({ limit: 200 }), api.getPriorityClusters(8)])
      .then(([detectionsRes, clustersRes]) => {
        if (cancelled) return;
        setDetections(detectionsRes.items);
        setClusters(clustersRes.clusters);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analysis");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const windowed = useMemo(() => {
    if (range === 9999) return detections;
    const since = Date.now() - range * 24 * 60 * 60 * 1000;
    return detections.filter((d) => new Date(d.reported_at).getTime() >= since);
  }, [detections, range]);

  const timeSeries = useMemo(() => buildTimeSeries(windowed, range === 9999 ? 60 : range), [windowed, range]);
  const tierCounts = useMemo(() => countByTier(windowed), [windowed]);
  const totalWindowed = windowed.length;

  const insights = useMemo(() => buildInsights(detections, clusters), [detections, clusters]);

  return (
    <div>
      <PageHeader
        title="Road Analysis & Priority"
        subtitle="Analyze road conditions and prioritize repairs using AI insights"
        actions={
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as RangeDays)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && <p className="text-sm text-slate-400">Loading analysis...</p>}

      {!loading && tab === "damage-stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Detected Damages Over Time" />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pothole" name="Potholes" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="crack" name="Cracks" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="other" name="Rutting/Raveling" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <CardHeader title="Severity Distribution" />
              <SeverityDonut counts={tierCounts} total={totalWindowed} size={160} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Most Affected Areas" />
              <AffectedAreasList clusters={clusters} />
            </Card>
            <Card>
              <CardHeader title="AI Insights" />
              <ul className="space-y-3">
                {insights.map((insight, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <insight.icon size={12} />
                    </span>
                    {insight.text}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {!loading && tab === "severity-dist" && (
        <Card>
          <CardHeader title="Severity Distribution" />
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <SeverityDonut counts={tierCounts} total={totalWindowed} size={220} />
            <div className="w-full max-w-sm space-y-2">
              {TIERS.map((tier) => (
                <div key={tier} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[tier] }} />
                    {tierLabel(tier)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {tierCounts[tier]} &middot;{" "}
                    {totalWindowed ? Math.round((tierCounts[tier] / totalWindowed) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {!loading && tab === "road-wise" && (
        <Card>
          <CardHeader title="Road-wise Analysis" />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-slate-400">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Location (lat, lon)</th>
                  <th className="py-2 pr-4">Detections</th>
                  <th className="py-2 pr-4">Dominant Severity</th>
                  <th className="py-2 pr-4">Priority Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clusters.map((c, i) => (
                  <tr key={c.cluster_id}>
                    <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-600">
                      {c.centroid_lat.toFixed(4)}, {c.centroid_lon.toFixed(4)}
                    </td>
                    <td className="py-2 pr-4 text-slate-700">{c.detection_count}</td>
                    <td className="py-2 pr-4 capitalize text-slate-700">{c.dominant_severity}</td>
                    <td className="py-2 pr-4 font-semibold text-slate-800">{c.score.toFixed(1)}</td>
                  </tr>
                ))}
                {clusters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No priority clusters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && tab === "priority-rec" && (
        <div className="space-y-3">
          {clusters.map((c, i) => {
            const rec = recommendationFor(c);
            return (
              <Card key={c.cluster_id} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    #{i + 1} &middot; {c.detection_count} detections near {c.centroid_lat.toFixed(4)},{" "}
                    {c.centroid_lon.toFixed(4)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{rec.text}</div>
                </div>
                <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${rec.badgeClass}`}>
                  {rec.label}
                </span>
              </Card>
            );
          })}
          {clusters.length === 0 && (
            <p className="text-sm text-slate-400">No priority clusters yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function buildTimeSeries(detections: Detection[], days: number) {
  const buckets = new Map<string, { pothole: number; crack: number; other: number }>();
  const todayUtcMidnight = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );

  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(todayUtcMidnight - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    buckets.set(key, { pothole: 0, crack: 0, other: 0 });
  }

  for (const detection of detections) {
    const key = detection.reported_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (detection.defect_class === "pothole") bucket.pothole += 1;
    else if (detection.defect_class === "crack") bucket.crack += 1;
    else bucket.other += 1;
  }

  return Array.from(buckets.entries()).map(([date, counts]) => ({
    label: formatDate(date),
    ...counts,
  }));
}

function countByTier(detections: Detection[]): Record<Tier, number> {
  const counts: Record<Tier, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const d of detections) counts[getTier(d)] += 1;
  return counts;
}

function SeverityDonut({
  counts,
  total,
  size,
}: {
  counts: Record<Tier, number>;
  total: number;
  size: number;
}) {
  const data = TIERS.map((tier) => ({ name: tierLabel(tier), value: counts[tier], tier }));
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={size * 0.32}
            outerRadius={size * 0.48}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.tier} fill={TIER_COLORS[entry.tier]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-800">{total}</span>
        <span className="text-[11px] text-slate-400">Total</span>
      </div>
    </div>
  );
}

function AffectedAreasList({ clusters }: { clusters: PriorityCluster[] }) {
  if (clusters.length === 0) {
    return <p className="text-sm text-slate-400">No clusters detected yet.</p>;
  }
  const maxCount = Math.max(...clusters.map((c) => c.detection_count));
  return (
    <ul className="space-y-2.5">
      {clusters.slice(0, 5).map((c, i) => (
        <li key={c.cluster_id} className="flex items-center gap-3">
          <span className="w-5 flex-shrink-0 text-sm font-semibold text-slate-400">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate font-medium text-slate-700">
                {c.centroid_lat.toFixed(4)}, {c.centroid_lon.toFixed(4)}
              </span>
              <span className="text-slate-500">{c.detection_count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(c.detection_count / maxCount) * 100}%`,
                  backgroundColor: TIER_COLORS[c.dominant_severity],
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function recommendationFor(cluster: PriorityCluster) {
  if (cluster.score >= 15 || cluster.dominant_severity === "high") {
    return {
      label: "Inspect Now",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      text: "High detection density and severity - recommend immediate site inspection.",
    };
  }
  if (cluster.score >= 7) {
    return {
      label: "Schedule Repair",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      text: "Moderate priority - schedule a repair crew within the next two weeks.",
    };
  }
  return {
    label: "Monitor",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
    text: "Low priority for now - keep this area in the next routine scan.",
  };
}

function buildInsights(detections: Detection[], clusters: PriorityCluster[]) {
  const insights: { icon: LucideIcon; text: string }[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last30 = detections.filter((d) => now - new Date(d.reported_at).getTime() <= 30 * day);
  const prev30 = detections.filter((d) => {
    const age = now - new Date(d.reported_at).getTime();
    return age > 30 * day && age <= 60 * day;
  });

  if (prev30.length > 0) {
    const pct = Math.round(((last30.length - prev30.length) / prev30.length) * 100);
    insights.push({
      icon: TrendingUp,
      text: `Damage reports ${pct >= 0 ? "increased" : "decreased"} ${Math.abs(pct)}% compared to the previous 30 days.`,
    });
  }

  const byClass = new Map<string, number>();
  for (const d of detections) byClass.set(d.defect_class, (byClass.get(d.defect_class) ?? 0) + 1);
  const topClass = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topClass && detections.length > 0) {
    insights.push({
      icon: AlertCircle,
      text: `${defectLabel(topClass[0])} is the most common defect (${Math.round((topClass[1] / detections.length) * 100)}% of all detections).`,
    });
  }

  const topCluster = [...clusters].sort((a, b) => b.score - a.score)[0];
  if (topCluster) {
    insights.push({
      icon: MapPinned,
      text: `Highest-priority cluster is near ${topCluster.centroid_lat.toFixed(4)}, ${topCluster.centroid_lon.toFixed(4)} with ${topCluster.detection_count} detections - recommend inspection.`,
    });
  }

  const pendingCount = detections.filter((d) => d.status === "pending").length;
  if (detections.length > 0) {
    insights.push({
      icon: ClipboardList,
      text: `${pendingCount} of ${detections.length} detections are still pending action.`,
    });
  }

  return insights;
}
