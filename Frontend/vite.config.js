import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  root: ".",
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ["defaults", "Safari >= 12", "iOS >= 12", "Chrome >= 49"],
      modernPolyfills: true,
      renderLegacyChunks: true,
      additionalLegacyPolyfills: [],
    }),
    visualizer({ filename: "stats.html" }),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2015",
  },
  optimizeDeps: {
    esbuildOptions: { target: "es2015" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
