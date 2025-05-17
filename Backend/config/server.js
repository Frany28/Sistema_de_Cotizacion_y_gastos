// Backend/config/server.js
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import listEndpoints from "express-list-endpoints";
import dotenv from "dotenv";

import { errorHandler } from "../Middleware/errorHandler.js";
import { logger } from "../Middleware/logger.js";

import clientesRoutes from "../routes/clientes.routes.js";
import serviciosProductosRoutes from "../routes/servicios_productos.routes.js";
import proveedoresRoutes from "../routes/proveedores.routes.js";
import cotizacionesRoutes from "../routes/cotizaciones.routes.js";
import gastosRoutes from "../routes/gastos.routes.js";
import solicitudesPagoRoutes from "../routes/solicitudesPago.routes.js";

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Puerto dinámico y URL del frontend
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();

// ─── Configuración CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [FRONTEND_URL];
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173"); // dev-server de Vite
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (Postman, mobile apps, etc)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("CORS origin not allowed: " + origin));
    },
    credentials: true,
  })
);

// ─── Session (opcional, según tu lógica) ──────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// ─── Middlewares globales ──────────────────────────────────────────────────────
app.use(logger);
app.use(express.json());

// ─── Rutas de tu API ───────────────────────────────────────────────────────────
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicios-productos", serviciosProductosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/solicitudes-pago", solicitudesPagoRoutes);

// ─── Servir frontend construido (dist) ─────────────────────────────────────────
const distPath = path.resolve(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─── Manejador de errores ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Log de endpoints en dev ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  console.log("ENDPOINTS:", listEndpoints(app));
}

// ─── Arrancar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
