import L from "leaflet";
import "leaflet.heat";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { HeatmapFeatureCollection } from "../types";
import { HEATMAP_GRADIENT } from "../lib/severity";

export default function HeatmapLayer({ data }: { data: HeatmapFeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const points: [number, number, number][] = data.features.map((f) => [
      f.geometry.coordinates[1],
      f.geometry.coordinates[0],
      f.properties.weight,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatLayer = (L as any).heatLayer(points, {
      radius: 22,
      blur: 18,
      maxZoom: 17,
      max: 6.0,
      gradient: HEATMAP_GRADIENT,
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [data, map]);

  return null;
}
