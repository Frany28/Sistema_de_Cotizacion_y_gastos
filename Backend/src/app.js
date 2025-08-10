// backend/src/app.js
import express from "express";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis"; // ← import nombrado correcto
import redisClient from "./config/redisClient.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

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
import "./jobs/purgarPapeleras.js";
import eventosArchivosRoutes from "./routes/eventosArchivos.routes.js";

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

app.set("trust proxy", 1);

/* ── CORS mínimo y correcto ────────────────────────────── */
const listaOrígenesPermitidos = [
  process.env.FRONTEND_URL || "http://localhost:5173",
];

const opcionesCors = {
  origin: (origen, callback) => {
    // Permite herramientas locales (origen null) y los orígenes configurados
    if (!origen || listaOrígenesPermitidos.includes(origen)) {
      return callback(null, true);
    }
    return callback(new Error("origenNoPermitido"), false);
  },
  credentials: true,
};

app.use(cors(opcionesCors));

/* ── Parsing ───────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Sesión ────────────────────────────────────────────── */
const esProduccion = process.env.NODE_ENV === "production";

const nombreCookie = "sidSistema"; // camelCase y claro
const opcionesDeCookie = {
  httpOnly: true,
  sameSite: "lax", // con proxy mismo origen es suficiente
  secure: esProduccion, // true en prod (https)
  maxAge: 1000 * 60 * 60 * 2, 
};

app.use(
  session({
    name: nombreCookie,
    secret: process.env.SESSION_SECRET || "secretoTemporal",
    resave: false,
    saveUninitialized: false,
    cookie: opcionesDeCookie,
    store: new RedisStore({ client: redisClient, prefix: "sess:" }),
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
/* ───── Rutas de seguridad ──────────────────────────────── */
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);
app.use("/api/archivos/eventos", eventosArchivosRoutes);

/* ───── Ruta de diagnóstico (temporal) ──────────────────── */
/* Útil para verificar si la cookie llega al backend y si la sesión existe.
   - Elimínala cuando termines de probar.
*/
app.get("/api/auth/debug-cookie", (req, res) => {
  res.json({
    tieneCookieSesion: Boolean(req.sessionID),
    sessionId: req.sessionID || null,
    tieneObjetoSesion: Boolean(req.session),
    usuarioEnSesion: req.session?.user || null,
  });
});

/* ───── 404 para API inexistente ─────────────────────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

/* ───── Error handler global ────────────────────────────── */
app.use(errorHandler);

export default app;
