import { Circle, Tooltip } from "react-leaflet";
import type { PriorityCluster } from "../types";
import { TIER_COLORS } from "../lib/severity";

export default function PriorityClusterLayer({ clusters }: { clusters: PriorityCluster[] }) {
  return (
    <>
      {clusters.map((cluster) => (
        <Circle
          key={cluster.cluster_id}
          center={[cluster.centroid_lat, cluster.centroid_lon]}
          radius={30 + cluster.detection_count * 4}
          pathOptions={{
            color: TIER_COLORS[cluster.dominant_severity],
            fillColor: TIER_COLORS[cluster.dominant_severity],
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: "4 3",
          }}
        >
          <Tooltip direction="top" opacity={0.95}>
            {cluster.detection_count} detections &middot; score {cluster.score.toFixed(1)}
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}
