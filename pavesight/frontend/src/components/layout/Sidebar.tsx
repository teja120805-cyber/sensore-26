import {
  BarChart3,
  Camera,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Route,
  Settings as SettingsIcon,
  Wrench,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-detection", label: "Live Detection", icon: Camera },
  { to: "/map", label: "Map View", icon: MapIcon },
  { to: "/road-analysis", label: "Road Analysis", icon: BarChart3 },
  { to: "/repair-priority", label: "Repair Priority", icon: Wrench },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          <Route size={22} strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-slate-800">PaveSight AI</div>
          <div className="text-[11px] text-slate-400">Safer Roads, Smarter Cities</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-4 text-[11px] font-medium text-slate-400">
        <Route size={13} />
        Better Roads, Brighter Tomorrow
      </div>
    </aside>
  );
}
