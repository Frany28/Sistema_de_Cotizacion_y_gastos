// /index.js
import express from "express";
import cors from "cors";
import session from "express-session";
import expressMysqlSession from "express-mysql-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import listEndpoints from "express-list-endpoints";

import { errorHandler } from "./Middleware/errorHandler.js";
import { logger } from "./Middleware/logger.js";

import clientesRoutes from "./routes/clientes.routes.js";
import serviciosProductosRoutes from "./routes/servicios_productos.routes.js";
import proveedoresRoutes from "./routes/proveedores.routes.js";
import cotizacionesRoutes from "./routes/cotizaciones.routes.js";
import gastosRoutes from "./routes/gastos.routes.js";
import registrosRoutes from "./routes/registros.routes.js";
import sucursalesRoutes from "./routes/sucursales.routes.js";
import cxcRoutes from "./routes/cxc.routes.js";
import abonosRoutes from "./routes/abonos.routes.js";
import solicitudesPagoRoutes from "./routes/solicitudesPago.routes.js";
import bancosRoutes from "./routes/bancos.routes.js";
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import permisosRoutes from "./routes/permisos.routes.js";
import rolesPermisosRoutes from "./routes/rolesPermisos.routes.js";

dotenv.config();

const app = express();

/* ----------  CORS  ---------- */
const allowedOrigins = [
  "https://sistemacotizaciongastos.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
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

/* ----------  Archivos estáticos  ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

/* ----------  Sesión persistente en MySQL  ---------- */
const MySQLStore = expressMysqlSession(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  clearExpired: true,
  expiration: 2 * 60 * 60 * 1000, // 2 h
  createDatabaseTable: true,
});

// Logs de depuración
sessionStore.on("connect", () => console.log("✅ MySQLStore conectado"));
sessionStore.on("error", (err) => console.error("❌ MySQLStore error:", err));

app.set("trust proxy", 1);
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "clave_super_segura",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      maxAge: 2 * 60 * 60 * 1000,
    },
  })
);

/* ----------  Middleware para refrescar sesión  ---------- */
app.use((req, _res, next) => {
  if (req.session) req.session.touch(); // mantiene la sesión viva
  next();
});

/* ----------  Middlewares globales  ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* ----------  Rutas  ---------- */
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
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);

/* ----------  404 para rutas API desconocidas  ---------- */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

if (process.env.NODE_ENV !== "production") {
  console.log("ENDPOINTS:", listEndpoints(app));
}

app.use(errorHandler);

/* ----------  Export para Vercel  ---------- */
export default app;

/* ----------  Listener local (se ignora en Vercel)  ---------- */
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`API local en http://localhost:${PORT}`));
}
