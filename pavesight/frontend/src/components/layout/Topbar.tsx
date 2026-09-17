import { Bell, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../lib/auth";
import { useSettings } from "../../lib/settings";

export default function Topbar() {
  const { isAuthenticated, email, logout } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const [highSeverityCount, setHighSeverityCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!settings.notifications.highSeverityAlerts) {
      setHighSeverityCount(0);
      return;
    }
    api
      .getStats()
      .then((stats) => {
        if (!cancelled) setHighSeverityCount(stats.by_severity.high ?? 0);
      })
      .catch(() => {
        if (!cancelled) setHighSeverityCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [settings.notifications.highSeverityAlerts]);

  const displayName = isAuthenticated ? settings.profile.name || "Admin" : "Guest";
  const displayRole = isAuthenticated ? settings.profile.role : "Not signed in";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
      <div className="relative w-full max-w-xs">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search location, road name..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden text-xs font-medium text-slate-400 sm:inline">{today}</span>

        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
          title={
            highSeverityCount > 0
              ? `${highSeverityCount} high-severity detection(s)`
              : "No new alerts"
          }
        >
          <Bell size={18} />
          {highSeverityCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>

        <div className="h-8 w-px bg-slate-200" />

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold text-slate-800">{displayName}</div>
              <div className="text-[11px] text-slate-400">{displayRole}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/dashboard");
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
