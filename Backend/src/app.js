// backend/src/app.js

import express from "express";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./config/redisClient.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

/* ── 1. Cargar variables de entorno ─────────────────────── */
dotenv.config();

/* ── 2. Obtener __dirname en ES Modules ─────────────────── */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ── 3. Inicializar Express ─────────────────────────────── */
const app = express();

/* ── 4. Confiar en proxy (Vercel/Netlify) ───────────────── */
app.set("trust proxy", 1);

/* ── 5. Configuración de CORS y preflight ───────────────── */
const origenesPermitidos = [
  process.env.FRONT_URL, // p.ej. https://sistemacotizaciongastos.netlify.app
  "http://localhost:5173", // entorno desarrollo local
].filter(Boolean);

const opcionesCors = {
  origin: (origen, callback) => {
    if (!origen || origenesPermitidos.includes(origen)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS no permitido: ${origen}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(opcionesCors));
app.options("*", cors(opcionesCors));

/* ── 6. Parsers de body y form-data ─────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── 7. Configuración de sesión con Redis ──────────────── */
const esProduccion = process.env.NODE_ENV === "production";
const redisStore = new RedisStore({ client: redisClient });

app.use(
  session({
    name: "connect.sid",
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: esProduccion, // solo HTTPS en producción
      sameSite: esProduccion ? "none" : "lax", // exigido por Safari iOS / Chrome móvil
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

/* ── 8. Middleware de logs ──────────────────────────────── */
import { logger } from "./Middleware/logger.js";
app.use(logger);

/* ── 9. Servir archivos estáticos ───────────────────────── */
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

/* ── 10. Importar rutas ─────────────────────────────────── */
import db from "./config/database.js"; // inicializar pool si lo necesitas

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

import authRoutes from "./routes/auth.routes.js";
import verificarPermisoRoutes from "./routes/verificarPermiso.routes.js";
import autenticarUsuarioRoutes from "./routes/autenticarUsuario.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import permisosRoutes from "./routes/permisos.routes.js";
import rolesPermisosRoutes from "./routes/rolesPermisos.routes.js";

/* ── 11. Montar rutas ───────────────────────────────────── */
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
app.use("/api/archivos/eventos", eventosArchivosRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/auth/verificar-permiso", verificarPermisoRoutes);
app.use("/api/auth/autenticar-usuario", autenticarUsuarioRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);

/* ── 12. Handler 404 para rutas API ─────────────────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta API no encontrada" });
  }
  next();
});

/* ── 13. Manejador global de errores ────────────────────── */
import { errorHandler } from "./Middleware/errorHandler.js";
app.use(errorHandler);

export default app;
