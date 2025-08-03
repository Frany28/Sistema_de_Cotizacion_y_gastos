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

/* ── Middlewares propios ────────────────────────────────── */
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
import almacenamientoRoutes from "./routes/almacenamiento.routes.js";
import eventosArchivosRoutes from "./routes/eventosArchivos.routes.js";

/* ── Rutas de seguridad ─────────────────────────────────── */
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import permisosRoutes from "./routes/permisos.routes.js";
import rolesPermisosRoutes from "./routes/rolesPermisos.routes.js";

/* ── Jobs ───────────────────────────────────────────────── */
import "./jobs/purgarPapeleras.js";

dotenv.config();

/* ───── Init ────────────────────────────────────────────── */
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ───── CORS ────────────────────────────────────────────── */
// Ajusta aquí las URLs exactas de tu frontend
const allowedOrigins = [
  process.env.FRONT_URL, // p.ej. https://sistema-de-cotizacion-y-gastos.netlify.app
  "https://sistemacotizaciongastos.netlify.app", // dominio sin guiones
  "http://localhost:5173", // desarrollo local
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Si no hay origin (p.ej. desde Postman) o está en la lista, permitir
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Si no está permitido, rechazar
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Preflight para todas las rutas
app.options("*", cors(corsOptions));
// Aplica CORS antes de express-session
app.use(cors(corsOptions));

/* ───── Sesión con Redis ────────────────────────────────── */
const esProduccion = process.env.NODE_ENV === "production";
const redisStore = new RedisStore({ client: redisClient });

app.set("trust proxy", 1);
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: esProduccion,
      sameSite: esProduccion ? "none" : "lax",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

/* ───── Estáticos y parsers ─────────────────────────────── */
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* ───── Rutas REST ──────────────────────────────────────── */
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
app.use("/api/almacenamiento", almacenamientoRoutes);

/* ───── Autenticación y permisos ────────────────────────── */
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);
app.use("/api/archivos/eventos", eventosArchivosRoutes);

/* ───── 404 para rutas de API inexistentes ─────────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

/* ───── Manejador global de errores ─────────────────────── */
app.use(errorHandler);

export default app;

