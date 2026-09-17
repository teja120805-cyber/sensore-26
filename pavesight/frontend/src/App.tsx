import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import LiveDetection from "./pages/LiveDetection";
import Login from "./pages/Login";
import MapViewPage from "./pages/MapViewPage";
import Reports from "./pages/Reports";
import RepairPriority from "./pages/RepairPriority";
import RoadAnalysis from "./pages/RoadAnalysis";
import SettingsPage from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/live-detection" element={<LiveDetection />} />
          <Route path="/map" element={<MapViewPage />} />
          <Route path="/road-analysis" element={<RoadAnalysis />} />
          <Route path="/repair-priority" element={<RepairPriority />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
