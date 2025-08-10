// Frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "es2015" },
  optimizeDeps: { esbuildOptions: { target: "es2015" } },
  // Opcional: solo útil en desarrollo local
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
