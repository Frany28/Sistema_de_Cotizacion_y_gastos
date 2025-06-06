// Backend/config/server.js
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
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
import bancosRoutes from "../routes/bancos.routes.js";
import db from "./database.js";

/* ─────────────  Rutas de seguridad  ──────────── */
import authRoutes from "../routes/auth.routes.js";
import usuariosRoutes from "../routes/usuarios.routes.js";
import rolesRoutes from "../routes/roles.routes.js";
import permisosRoutes from "../routes/permisos.routes.js";
import rolesPermisosRoutes from "../routes/rolesPermisos.routes.js";

/* ─────────────  Config básica  ───────────── */
module.exports = (req, res) => {
  res.end("Hola desde Vercel");
};

dotenv.config(); // lee .env local / Railway
const PORT = process.env.PORT || 3000; // Railway asigna PORT
const FRONT_URL = process.env.FRONT_URL; // https://sistemacotizaciongastos.netlify.app

const app = express();

/* ─────────────  CORS ───────────── */
const allowedOrigins = [
  "https://sistemacotizaciongastos.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Credentials",
    ],
    exposedHeaders: ["Access-Control-Allow-Origin"],
  })
);

app.use((req, res, next) => {
  const origen = req.headers.origin;
  res.header(
    "Access-Control-Allow-Origin",
    allowedOrigins.includes(origen) ? origen : ""
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-Requested-With"
  );
  next();
});

/* ─────────────  ESM helper para __dirname ───────────── */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─────────────  Servir archivos subidos ───────────── */
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

/* ─────────────  Sesiones ───────────── */
app.set("trust proxy", 1); // Railway / Render terminan TLS antes del contenedor

app.use(
  session({
    secret: process.env.SESSION_SECRET || "clave_super_segura",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // requiere HTTPS (activo en prod)
      httpOnly: true,
      sameSite: "none", // necesario para cross-site cookies
      maxAge: 2 * 60 * 60 * 1000, // 2 h
    },
  })
);

/* ─────────────  Parsers y logger ───────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* ─────────────  Endpoints funcionales ───────────── */
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
app.use("/api/bancos", bancosRoutes);
app.use("/api/proveedores", proveedoresRoutes);

/* ─────────────  Endpoints de seguridad ──────────── */
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);

/* ─────────────  404 para rutas API inexistentes ───────────── */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

/* ─────────────  Listar endpoints en desarrollo ───────────── */
if (process.env.NODE_ENV !== "production") {
  console.log("ENDPOINTS:", listEndpoints(app));
}

/* ─────────────  Manejador global de errores ───────────── */
app.use(errorHandler);

/* ─────────────  Arrancar servidor ───────────── */
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
