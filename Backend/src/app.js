// backend/src/app.js

import express from "express";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./config/redisClient.js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

/* ── 1. Cargar variables de entorno ──────────────────────── */
dotenv.config();

/* ── 2. __dirname en ES Modules ──────────────────────────── */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ── 3. Inicializar Express ──────────────────────────────── */
const app = express();

/* ── 4. Trust proxy (HTTPS detrás de Vercel/Netlify) ────── */
app.set("trust proxy", 1);

/* ── 5. Configuración de CORS ───────────────────────────── */
const listaOrígenesPermitidos = [
  process.env.FRONT_URL, // URL de tu frontend en Netlify
  "http://localhost:5173", // para desarrollo local
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

/* ── 6. Parsers de body ──────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── 7. Configuración de sesión con Redis ───────────────── */
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
      secure: esProduccion, // sólo HTTPS en producción
      sameSite: esProduccion ? "none" : "lax", // necesario en Chrome móvil y Safari iOS
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

/* ── 8. Archivos estáticos ───────────────────────────────── */
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

/* ── 9. Logger de peticiones ─────────────────────────────── */
import { logger } from "./Middleware/logger.js";
app.use(logger);

/* ── 10. Importar y montar rutas ─────────────────────────── */
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

/* ── 11. Manejador 404 para API inexistente ──────────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

/* ── 12. Manejador global de errores ─────────────────────── */
import { errorHandler } from "./Middleware/errorHandler.js";
app.use(errorHandler);

export default app;
