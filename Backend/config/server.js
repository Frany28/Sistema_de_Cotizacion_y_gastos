// Backend/config/server.js
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import listEndpoints from "express-list-endpoints";

import { errorHandler } from "../Middleware/errorHandler.js";
import { logger } from "../Middleware/logger.js";

/* ─────────────  Rutas funcionales  ───────────── */
import clientesRoutes from "../routes/clientes.routes.js";
import serviciosProductosRoutes from "../routes/servicios_productos.routes.js";
import proveedoresRoutes from "../routes/proveedores.routes.js";
import cotizacionesRoutes from "../routes/cotizaciones.routes.js";
import gastosRoutes from "../routes/gastos.routes.js";
import registrosRoutes from "../routes/registros.routes.js";
import sucursalesRoutes from "../routes/sucursales.routes.js";
import cxcRoutes from "../routes/cxc.routes.js";
import abonosRoutes from "../routes/abonos.routes.js";
import solicitudesPagoRoutes from "../routes/solicitudesPago.routes.js";

/* ─────────────  Rutas de seguridad  ──────────── */
import authRoutes from "../routes/auth.routes.js";
import usuariosRoutes from "../routes/usuarios.routes.js";
import rolesRoutes from "../routes/roles.routes.js";
import permisosRoutes from "../routes/permisos.routes.js";
import rolesPermisosRoutes from "../routes/rolesPermisos.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Resolving __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─────────────  SERVE UPLOADS ───────────── */
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

/* ─────────────  CORS and SESSION ───────────── */
// Allowed origins: local dev and production FRONTEND_URL
const allowedOrigins = [
  "http://localhost:5173", // dev
  process.env.FRONTEND_URL, // set to your production frontend URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "clave_super_segura",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

/* ─────────────  Parsers and Logger ───────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* ─────────────  System Endpoints ───────────── */
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicios-productos", serviciosProductosRoutes);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/registros", registrosRoutes);
app.use("/api/sucursales", sucursalesRoutes);
app.use("/api/cuentas-por-cobrar", cxcRoutes);
app.use("/api/abonos", abonosRoutes);
app.use("/api/solicitudes-pago", solicitudesPagoRoutes);

/* ─────────────  Security Endpoints ──────────── */
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);

// 404 for API routes
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

// Development only: list endpoints
if (process.env.NODE_ENV !== "production") {
  console.log("ENDPOINTS:", listEndpoints(app));
}

/* ─────────────  Serve React Build ──────────── */
const clientDist = path.resolve(__dirname, "../../dist");
if (fs.existsSync(clientDist)) {
  console.log("Serving static files from:", clientDist);
  app.use(express.static(clientDist));
  // SPA fallback without path-to-regexp
  app.use((_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

/* ─────────────  Global Error Handler ───────────── */
app.use(errorHandler);

/* ─────────────  Start Server ───────────── */
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
