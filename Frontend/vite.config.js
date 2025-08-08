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
    visualizer({ filename: "stats.html" }),
    legacy({
      targets: ["defaults", "not IE 11"], // Ajusta según compatibilidad que quieras
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"], // útil para async/await
    }),
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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
