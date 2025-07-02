import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// ▶️  Explicación breve
// Añadimos la sección "resolve.dedupe" para obligar a Vite a usar
// **una sola instancia** de React, React‑DOM y React Query.
// Además aliasamos cualquier import accidental de "react-query"
// hacia la ruta correcta "@tanstack/react-query".
// Con esto evitamos el error:
//   TypeError: c.defaultQueryOptions is not a function.

export default defineConfig({
  root: ".", // carpeta raíz del proyecto
  plugins: [react(), tailwindcss(), visualizer({ filename: "stats.html" })],

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
      // redirige cualquier import antiguo de 'react-query'
      "react-query": "@tanstack/react-query",
    },
    // 🔑 dedupe garantiza un único paquete en el bundle
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  // optimizamos deps para garantizar que Vite pre‑bundlee
  // la misma versión ESM de React Query en modo dev.
  optimizeDeps: {
    include: ["@tanstack/react-query"],
  },
});
