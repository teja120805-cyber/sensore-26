import { useState } from "react";
import Card, { CardHeader } from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import Switch from "../components/ui/Switch";
import Tabs from "../components/ui/Tabs";
import { getSettings, resetSettings, updateSettings, useSettings } from "../lib/settings";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "notifications", label: "Notifications" },
  { key: "map-prefs", label: "Map Preferences" },
  { key: "system", label: "System Settings" },
];

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ??
  "http://localhost:8000/api/v1";

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const settings = useSettings();
  const [profileDraft, setProfileDraft] = useState(settings.profile);
  const [saved, setSaved] = useState(false);

  function handlePhotoChange(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileDraft((p) => ({ ...p, photoDataUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleSaveProfile() {
    updateSettings({ profile: profileDraft });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initial = profileDraft.name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, preferences and system settings" />

      <div className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "profile" && (
        <Card className="max-w-2xl">
          <CardHeader title="Profile Information" />
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xl font-bold text-white">
              {profileDraft.photoDataUrl ? (
                <img src={profileDraft.photoDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
              Change Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
            <TextField
              label="Name"
              value={profileDraft.name}
              onChange={(v) => setProfileDraft((p) => ({ ...p, name: v }))}
            />
            <TextField
              label="Email"
              type="email"
              value={profileDraft.email}
              onChange={(v) => setProfileDraft((p) => ({ ...p, email: v }))}
            />
            <TextField
              label="Organization"
              value={profileDraft.organization}
              onChange={(v) => setProfileDraft((p) => ({ ...p, organization: v }))}
            />
            <TextField
              label="Role"
              value={profileDraft.role}
              onChange={(v) => setProfileDraft((p) => ({ ...p, role: v }))}
            />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button
              onClick={handleSaveProfile}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
            {saved && <span className="text-sm text-green-600">Saved.</span>}
          </div>
        </Card>
      )}

      {tab === "notifications" && (
        <Card className="max-w-2xl">
          <CardHeader title="Notification Settings" />
          <div className="divide-y divide-slate-100">
            <ToggleRow
              label="New Detection Alerts"
              description="Notify when new road defects are detected"
              checked={settings.notifications.newDetectionAlerts}
              onChange={(v) => updateSettings({ notifications: { ...getSettings().notifications, newDetectionAlerts: v } })}
            />
            <ToggleRow
              label="High Severity Alerts"
              description="Show a badge in the top bar when high-severity detections are pending"
              checked={settings.notifications.highSeverityAlerts}
              onChange={(v) => updateSettings({ notifications: { ...getSettings().notifications, highSeverityAlerts: v } })}
            />
            <ToggleRow
              label="Weekly Summary Report"
              description="Remember whether you want a weekly digest (delivery not yet wired up)"
              checked={settings.notifications.weeklySummary}
              onChange={(v) => updateSettings({ notifications: { ...getSettings().notifications, weeklySummary: v } })}
            />
            <ToggleRow
              label="System Updates"
              description="Remember whether you want to be told about platform changes"
              checked={settings.notifications.systemUpdates}
              onChange={(v) => updateSettings({ notifications: { ...getSettings().notifications, systemUpdates: v } })}
            />
          </div>
        </Card>
      )}

      {tab === "map-prefs" && (
        <Card className="max-w-2xl">
          <CardHeader title="Map Preferences" />
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Default View</div>
                <div className="text-xs text-slate-400">Layer shown when Map View first loads</div>
              </div>
              <select
                value={settings.mapPrefs.defaultView}
                onChange={(e) =>
                  updateSettings({ mapPrefs: { ...getSettings().mapPrefs, defaultView: e.target.value as "markers" | "heatmap" } })
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                <option value="heatmap">Heatmap</option>
                <option value="markers">Markers</option>
              </select>
            </div>

            <ToggleRow
              label="Show Cluster Circles"
              description="Overlay priority-cluster radius circles on the map"
              checked={settings.mapPrefs.showClusterCircles}
              onChange={(v) => updateSettings({ mapPrefs: { ...getSettings().mapPrefs, showClusterCircles: v } })}
            />
            <ToggleRow
              label="Show Repaired Locations"
              description="Include repaired detections when no explicit status filter is set"
              checked={settings.mapPrefs.showRepaired}
              onChange={(v) => updateSettings({ mapPrefs: { ...getSettings().mapPrefs, showRepaired: v } })}
            />
          </div>
        </Card>
      )}

      {tab === "system" && (
        <Card className="max-w-2xl">
          <CardHeader title="System Settings" />
          <div className="space-y-3 text-sm">
            <InfoRow label="API Base URL" value={API_BASE_URL} />
            <InfoRow label="Frontend" value="React + Vite + TypeScript + Tailwind" />
            <InfoRow label="Map tiles" value="OpenStreetMap" />
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              onClick={() => {
                resetSettings();
                setProfileDraft(getSettings().profile);
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Reset local preferences
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Clears profile, notification, and map preferences stored in this browser. Detection
              data on the server is unaffected.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-xs text-slate-700">{value}</span>
    </div>
  );
}
