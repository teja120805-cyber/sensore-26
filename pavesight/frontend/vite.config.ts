import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Bind-mounted volumes under Docker Desktop on Windows/macOS don't
      // reliably deliver native fs-change events, so HMR silently stalls
      // without polling.
      usePolling: true,
      interval: 300,
    },
  },
});
