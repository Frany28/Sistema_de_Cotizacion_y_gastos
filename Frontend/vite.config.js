// vite.config.js  (raíz del Frontend)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // redirige cualquier import accidental
      "react-query": "@tanstack/react-query",
      // tu alias «@» si lo usas
      "@": path.resolve(__dirname, "src"),
    },
    // <--  dedupe para DEV y para ROLLUP
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  optimizeDeps: {
    // sólo afecta a dev, pero lo mantenemos
    include: ["@tanstack/react-query"],
  },

  build: {
    rollupOptions: {
      // ⚠️  fuerza que estas libs siempre vengan de la raíz
      external: [
        "react",
        "react-dom",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  },
});
