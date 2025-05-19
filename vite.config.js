import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: path.resolve(__dirname, "Frontend"), // aquí apuntas al subdirectorio
  plugins: [react(), tailwindcss()],
  base: "/",
  server: { host: "0.0.0.0", port: 5173 },
  build: {
    outDir: path.resolve(__dirname, "Frontend", "dist"),
    emptyOutDir: true,
  },
});
