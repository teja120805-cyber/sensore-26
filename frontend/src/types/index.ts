export type Severity = "low" | "medium" | "high";
export type DetectionStatus = "pending" | "scheduled" | "repaired";

export interface Detection {
  id: number;
  reported_at: string;
  lat: number;
  lon: number;
  altitude_m: number | null;
  defect_class: string;
  severity: Severity;
  confidence: number;
  area_m2: number | null;
  image_url: string | null;
  status: DetectionStatus;
  created_at: string;
}

export interface DetectionIngest {
  timestamp: string;
  lat: number;
  lon: number;
  altitude_m?: number | null;
  severity: Severity;
  confidence: number;
  area_m2?: number | null;
  defect_class: string;
  image_base64?: string | null;
}

export interface DetectionListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Detection[];
}

export interface StatusHistoryEntry {
  id: number;
  old_status: DetectionStatus | null;
  new_status: DetectionStatus | null;
  changed_by: string | null;
  changed_at: string;
}

export interface DetectionUpdateResponse extends Detection {
  status_history: StatusHistoryEntry[];
}

export interface HeatmapFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { weight: number; severity: Severity };
}

export interface HeatmapFeatureCollection {
  type: "FeatureCollection";
  features: HeatmapFeature[];
}

export interface PriorityCluster {
  cluster_id: number;
  centroid_lat: number;
  centroid_lon: number;
  score: number;
  detection_count: number;
  dominant_severity: Severity;
  detection_ids: number[];
}

export interface PriorityClusterResponse {
  clusters: PriorityCluster[];
}

export interface StatsResponse {
  total: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
}

export interface InferenceDetectionBox {
  class_name: string;
  confidence: number;
  severity: Severity;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  area_fraction: number;
}

export interface InferenceResponse {
  image_width: number;
  image_height: number;
  detections: InferenceDetectionBox[];
  model_version: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DetectionFilters {
  severity?: Severity[];
  status?: DetectionStatus[];
  date_from?: string;
  date_to?: string;
  bbox?: string;
  limit?: number;
  offset?: number;
}
