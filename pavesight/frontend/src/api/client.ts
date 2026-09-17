import type {
  Detection,
  DetectionFilters,
  DetectionIngest,
  DetectionListResponse,
  DetectionUpdateResponse,
  HeatmapFeatureCollection,
  InferenceResponse,
  LoginRequest,
  PriorityClusterResponse,
  StatsResponse,
  TokenResponse,
} from "../types";

const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const TOKEN_STORAGE_KEY = "pavesight_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  if (rest.body && !(rest.body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function buildQuery(filters: DetectionFilters): string {
  const params = new URLSearchParams();
  if (filters.severity) filters.severity.forEach((s) => params.append("severity", s));
  if (filters.status) filters.status.forEach((s) => params.append("status", s));
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.bbox) params.set("bbox", filters.bbox);
  params.set("limit", String(filters.limit ?? 50));
  params.set("offset", String(filters.offset ?? 0));
  return params.toString();
}

export const api = {
  listDetections(filters: DetectionFilters = {}): Promise<DetectionListResponse> {
    return request(`/detections?${buildQuery(filters)}`);
  },

  getDetection(id: number): Promise<Detection> {
    return request(`/detections/${id}`);
  },

  ingestDetection(payload: DetectionIngest): Promise<Detection> {
    return request(`/detections`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  detectImage(image: Blob): Promise<InferenceResponse> {
    const formData = new FormData();
    formData.append("image", image, "frame.jpg");
    return request(`/inference/detect`, {
      method: "POST",
      body: formData,
    });
  },

  updateDetectionStatus(
    id: number,
    status: Detection["status"]
  ): Promise<DetectionUpdateResponse> {
    return request(`/detections/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      auth: true,
    });
  },

  getHeatmap(): Promise<HeatmapFeatureCollection> {
    return request(`/heatmap`);
  },

  getPriorityClusters(limit = 10): Promise<PriorityClusterResponse> {
    return request(`/priority-clusters?limit=${limit}`);
  },

  getStats(): Promise<StatsResponse> {
    return request(`/stats`);
  },

  login(payload: LoginRequest): Promise<TokenResponse> {
    return request(`/auth/login`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export { ApiError };
