import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Detection, HeatmapFeatureCollection, PriorityCluster } from "../types";
import HeatmapLayer from "./HeatmapLayer";
import MarkerLayer from "./MarkerLayer";
import PriorityClusterLayer from "./PriorityClusterLayer";

export type ViewMode = "heatmap" | "markers";

export interface FlyTarget {
  lat: number;
  lon: number;
  zoom?: number;
}

function FlyToHandler({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lon], target.zoom ?? 17, { duration: 0.8 });
    }
  }, [target, map]);
  return null;
}

interface MapProps {
  center: [number, number];
  zoom: number;
  viewMode: ViewMode;
  detections: Detection[];
  heatmapData: HeatmapFeatureCollection | null;
  flyTarget?: FlyTarget | null;
  clusters?: PriorityCluster[];
  className?: string;
  scrollWheelZoom?: boolean;
}

export default function Map({
  center,
  zoom,
  viewMode,
  detections,
  heatmapData,
  flyTarget = null,
  clusters,
  className = "h-full w-full",
  scrollWheelZoom = true,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`relative z-0 ${className}`}
      scrollWheelZoom={scrollWheelZoom}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {viewMode === "heatmap" ? (
        <HeatmapLayer data={heatmapData} />
      ) : (
        <MarkerLayer detections={detections} />
      )}
      {clusters && clusters.length > 0 && <PriorityClusterLayer clusters={clusters} />}
      <FlyToHandler target={flyTarget} />
    </MapContainer>
  );
}
