import express from "express";
import cors from "cors";
import session from "express-session";
import connectRedis from "connect-redis";
import redisClient from "./config/redisClient.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

/* ── Variables de entorno ───────────────────────────────── */
dotenv.config();

/* ── Inicializar Express ───────────────────────────────── */
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ── Base de datos ─────────────────────────────────────── */
import db from "./config/database.js";

/* ── Middlewares propios ───────────────────────────────── */
import { errorHandler } from "./Middleware/errorHandler.js";
import { logger } from "./Middleware/logger.js";

/* ── Rutas de negocio ──────────────────────────────────── */
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

/* ── 1. Trust proxy para HTTPS detrás de proxy ──────────── */
app.set("trust proxy", 1);

/* ── 2. Configuración de sesión con Redis ──────────────── */
const RedisStore = connectRedis(session);
const redisStore = new RedisStore({ client: redisClient });
const esProduccion = process.env.NODE_ENV === "production";

app.use(
  session({
    name: "connect.sid",
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: esProduccion, // solo en HTTPS producción
      sameSite: esProduccion ? "none" : "lax", // Safari/iOS y Chrome móvil
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

/* ── 3. Configuración de CORS ──────────────────────────── */
const listaOrígenesPermitidos = [
  process.env.FRONT_URL, // tu frontend en Netlify
  "http://localhost:5173", // entorno de desarrollo
].filter(Boolean);

app.use(
  cors({
    origin: (origen, callback) =>
      !origen || listaOrígenesPermitidos.includes(origen)
        ? callback(null, true)
        : callback(new Error(`CORS no permitido: ${origen}`)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ── 4. Parsers y archivos estáticos ────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

/* ── 5. Logger de peticiones ───────────────────────────── */
app.use(logger);

/* ── 6. Montar rutas ───────────────────────────────────── */
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

/* ── 7. Handler 404 para APIs ───────────────────────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

/* ── 8. Manejador global de errores ────────────────────── */
app.use(errorHandler);

export default app;
