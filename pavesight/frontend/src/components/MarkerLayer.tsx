import L from "leaflet";
import "leaflet.markercluster";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import type { Detection } from "../types";
import { getTier, TIER_COLORS } from "../lib/severity";
import DetectionPopup from "./DetectionPopup";

function severityIcon(detection: Detection) {
  const color = TIER_COLORS[getTier(detection)];
  return L.divIcon({
    className: "pavesight-marker",
    html: `<span style="background:${color};width:14px;height:14px;display:block;border-radius:50%;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MarkerLayer({ detections }: { detections: Detection[] }) {
  const map = useMap();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 45,
    });

    detections.forEach((detection) => {
      const marker = L.marker([detection.lat, detection.lon], {
        icon: severityIcon(detection),
      });
      marker.bindPopup(renderToStaticMarkup(<DetectionPopup detection={detection} />));
      clusterGroup.addLayer(marker);
    });

    clusterGroup.addTo(map);
    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [detections, map]);

  return null;
}
