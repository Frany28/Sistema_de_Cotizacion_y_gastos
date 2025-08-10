// backend/src/app.js
import express from "express";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis"; // ← import nombrado correcto
import redisClient from "./config/redisClient.js";

import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

/* ── Pool global ───────────────────────────────────────────- */
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

/* ───── CORS (antes de sesión) ──────────────────────────── */
/* Explicación:
   - Permitimos peticiones del mismo origen (sin header Origin) y de la lista de orígenes permitidos.
   - credentials:true para permitir cookies (sessión) entre frontend y backend.
*/
const origenesPermitidos = [
  process.env.FRONT_URL, // producción (tu dominio en Netlify, p.ej. https://tu-app.netlify.app)
  "http://localhost:5173", // desarrollo local
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin no permitido: ${origin}`));
    },
    credentials: true,
  })
);

/* ───── Config sesión con Redis ─────────────────────────── */
/* Explicación:
   - sameSite se decide por variable de entorno:
       USAR_PROXY_MISMO_ORIGEN=true  → sameSite:'lax' (cuando usas proxy /api y todo sale por mismo dominio)
       (ausente o false)             → sameSite:'none' (cuando frontend y backend están en dominios distintos - cross-site)
*/
const isProd = process.env.NODE_ENV === "production";
const usarProxyMismoOrigen = process.env.USAR_PROXY_MISMO_ORIGEN === "true";
const valorSameSiteCookie = usarProxyMismoOrigen ? "lax" : "none";

const redisStore = new RedisStore({ client: redisClient });

app.set("trust proxy", 1);
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd, 
      sameSite: "none", 
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
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
