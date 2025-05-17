import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "frontend"), // aquí apuntas al subdirectorio
  plugins: [react()],
  base: "/",
  server: { host: "0.0.0.0", port: 5173 }, // evita chocar con tu backend en 3000
  build: {
    outDir: path.resolve(__dirname, "dist"), // opcional: dónde dejar la build final
    emptyOutDir: true,
  },
});
