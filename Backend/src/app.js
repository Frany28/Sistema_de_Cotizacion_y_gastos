// backend/src/app.js
import express from "express";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./config/redisClient.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

/* ── Pool global ─────────────────────────────────────────── */
import db from "./config/database.js";

/* ── Middlewares propios ─────────────────────────────────― */
import { errorHandler } from "./Middleware/errorHandler.js";
import { logger } from "./Middleware/logger.js";

/* ── Rutas de negocio ───────────────────────────────────── */
import clientesRoutes from "./routes/clientes.routes.js";
import serviciosProductosRoutes from "./routes/servicios_productos.routes.js";
import proveedoresRoutes from "./routes/proveedores.routes.js";
import cotizacionesRoutes from "./routes/cotizaciones.routes.js";
import gastosRoutes from "./routes/gastos.routes.js";
import registrosRoutes from "./routes/registros.routes.js";
import sucursalesRoutes from "./routes/sucursales.routes.js";
import cxcRoutes from "./routes/cxc.routes.js";
import solicitudesPagoRoutes from "./routes/solicitudesPago.routes.js";
import bancosRoutes from "./routes/bancos.routes.js";
import archivosRoutes from "./routes/archivos.routes.js";
import "./jobs/purgarPapeleras.js";

/* ── Seguridad ───────────────────────────────────────────── */
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import permisosRoutes from "./routes/permisos.routes.js";
import rolesPermisosRoutes from "./routes/rolesPermisos.routes.js";

dotenv.config();

/* ───── Init ─────────────────────────────────────────────── */
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
await redisReady;
const isProd = process.env.NODE_ENV === "production";
const redisStore = new RedisStore({ client: redisClient });

app.set("trust proxy", 1);
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false, // ← evita UPDATE innecesario
    saveUninitialized: false, // ← no crea sesiones vacías
    cookie: {
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 h
    },
  })
);

/* ───── CORS ─────────────────────────────────────────────── */
const allowedOrigins = [
  process.env.FRONT_URL, // prod
  "http://localhost:5173", // dev
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error(`CORS origin not allowed: ${origin}`)),
    credentials: true,
  })
);

/* ───── Estáticos y parsers ─────────────────────────────── */
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* ───── Rutas REST ───────────────────────────────────────── */
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicios-productos", serviciosProductosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/registros", registrosRoutes);
app.use("/api/sucursales", sucursalesRoutes);
app.use("/api/cuentas", cxcRoutes);
app.use("/api/solicitudes-pago", solicitudesPagoRoutes);
app.use("/api/bancos", bancosRoutes);
app.use("/api/archivos", archivosRoutes);

/* ───── Rutas de seguridad ──────────────────────────────── */
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);

/* ───── 404 para API inexistente ─────────────────────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

/* ───── Error handler global ─────────────────────────────── */
app.use(errorHandler);

export default app;
