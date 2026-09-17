import { useSyncExternalStore } from "react";

export interface Profile {
  name: string;
  email: string;
  organization: string;
  role: string;
  photoDataUrl?: string;
}

export interface NotificationPrefs {
  newDetectionAlerts: boolean;
  highSeverityAlerts: boolean;
  weeklySummary: boolean;
  systemUpdates: boolean;
}

export interface MapPrefs {
  defaultView: "markers" | "heatmap";
  showClusterCircles: boolean;
  showRepaired: boolean;
}

export interface Settings {
  profile: Profile;
  notifications: NotificationPrefs;
  mapPrefs: MapPrefs;
}

const STORAGE_KEY = "pavesight_settings";

const DEFAULTS: Settings = {
  profile: {
    name: "Admin User",
    email: "",
    organization: "PaveSight",
    role: "Administrator",
  },
  notifications: {
    newDetectionAlerts: true,
    highSeverityAlerts: true,
    weeklySummary: true,
    systemUpdates: false,
  },
  mapPrefs: {
    defaultView: "heatmap",
    showClusterCircles: true,
    showRepaired: true,
  },
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      profile: { ...DEFAULTS.profile, ...parsed.profile },
      notifications: { ...DEFAULTS.notifications, ...parsed.notifications },
      mapPrefs: { ...DEFAULTS.mapPrefs, ...parsed.mapPrefs },
    };
  } catch {
    return DEFAULTS;
  }
}

let current: Settings = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // storage unavailable (private mode, quota) - keep in-memory value only
  }
  listeners.forEach((l) => l());
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = {
    profile: { ...current.profile, ...patch.profile },
    notifications: { ...current.notifications, ...patch.notifications },
    mapPrefs: { ...current.mapPrefs, ...patch.mapPrefs },
  };
  persist();
}

export function resetSettings(): void {
  current = DEFAULTS;
  persist();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}
