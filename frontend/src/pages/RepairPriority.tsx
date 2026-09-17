import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { TierBadge } from "../components/StatusBadge";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../lib/auth";
import { getTier } from "../lib/severity";
import type { Detection, PriorityCluster } from "../types";

export default function RepairPriority() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<PriorityCluster[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clustersRes, detectionsRes] = await Promise.all([
        api.getPriorityClusters(15),
        api.listDetections({ limit: 200 }),
      ]);
      setClusters(clustersRes.clusters);
      setDetections(detectionsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repair priorities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const detectionById = useMemo(() => {
    const map = new Map<number, Detection>();
    for (const d of detections) map.set(d.id, d);
    return map;
  }, [detections]);

  async function scheduleCluster(cluster: PriorityCluster) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setActingId(cluster.cluster_id);
    setMessage(null);
    try {
      const pendingIds = cluster.detection_ids.filter((id) => {
        const d = detectionById.get(id);
        return d && d.status === "pending";
      });
      await Promise.all(pendingIds.map((id) => api.updateDetectionStatus(id, "scheduled")));
      setMessage({ ok: true, text: `Scheduled ${pendingIds.length} detection(s) for repair.` });
      await loadData();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to schedule repairs" });
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Repair Priority"
        subtitle="Spatial clusters of detections ranked by severity, confidence and recency"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2 text-sm ${
            message.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
      {!isAuthenticated && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Sign in as an admin to schedule repairs for a cluster.
        </div>
      )}
      {loading && <p className="text-sm text-slate-400">Loading...</p>}
      {!loading && clusters.length === 0 && (
        <p className="text-sm text-slate-400">No priority clusters yet.</p>
      )}

      <div className="space-y-3">
        {clusters.map((cluster, i) => {
          const members = cluster.detection_ids.map((id) => detectionById.get(id)).filter(Boolean) as Detection[];
          const pendingCount = members.filter((d) => d.status === "pending").length;
          const scheduledCount = members.filter((d) => d.status === "scheduled").length;
          const repairedCount = members.filter((d) => d.status === "repaired").length;
          const dominantMembers = members.filter((d) => d.severity === cluster.dominant_severity);
          const avgConfidence = dominantMembers.length
            ? dominantMembers.reduce((sum, d) => sum + d.confidence, 0) / dominantMembers.length
            : 0;

          return (
            <Card key={cluster.cluster_id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    #{i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <MapPin size={14} className="text-slate-400" />
                      {cluster.centroid_lat.toFixed(4)}, {cluster.centroid_lon.toFixed(4)}
                      <TierBadge
                        tier={getTier({ severity: cluster.dominant_severity, confidence: avgConfidence })}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {cluster.detection_count} detections &middot; score {cluster.score.toFixed(1)} &middot;{" "}
                      {pendingCount} pending, {scheduledCount} scheduled, {repairedCount} repaired
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      navigate("/map", {
                        state: { flyTo: { lat: cluster.centroid_lat, lon: cluster.centroid_lon } },
                      })
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    View on Map
                  </button>
                  <button
                    onClick={() => scheduleCluster(cluster)}
                    disabled={actingId === cluster.cluster_id || pendingCount === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actingId === cluster.cluster_id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    {pendingCount === 0 ? "All scheduled" : "Schedule Repairs"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
