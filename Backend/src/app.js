// backend/src/app.js
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import listEndpoints from "express-list-endpoints";
import mysql from "mysql2/promise";
import mysqlSession from "express-mysql-session";

// Middlewares propios
import { errorHandler } from "./Middleware/errorHandler.js";
import { logger } from "./Middleware/logger.js";

// Rutas funcionales
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

// Rutas de auth y seguridad
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import permisosRoutes from "./routes/permisos.routes.js";
import rolesPermisosRoutes from "./routes/rolesPermisos.routes.js";

dotenv.config();
const app = express();
// Obtener el nombre del archivo y directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de la conexión a la base de datos MySQL
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 2,
  maxIdle: 1,
});

const MySQLStore = mysqlSession(session);
const sessionStore = new MySQLStore(dbPool);

app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// CORS dinámico usando FRONT_URL de tu env y localhost
const allowedOrigins = [process.env.FRONT_URL, "http://localhost:5173"].filter(
  Boolean
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Access-Control-Allow-Origin"],
  })
);

// Servir estáticos (uploads)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Sesiones
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      secure: true,
      httpOnly: true,
      sameSite: "none",
      maxAge: 2 * 60 * 60 * 1000, // 2 horas
    },
  })
);

// Parsers y logger
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Montaje de rutas
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicios-productos", serviciosProductosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/registros", registrosRoutes);
app.use("/api/sucursales", sucursalesRoutes);
app.use("/api/cuentas-por-cobrar", cxcRoutes);
app.use("/api/abonos", abonosRoutes);
app.use("/api/solicitudes-pago", solicitudesPagoRoutes);
app.use("/api/bancos", bancosRoutes);

// Auth y seguridad
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/permisos", permisosRoutes);
app.use("/api/roles-permisos", rolesPermisosRoutes);

// 404 para rutas API inexistentes
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ message: "Ruta no encontrada" });
  }
  next();
});

// Listar endpoints en dev
if (process.env.NODE_ENV !== "production") {
  console.log("ENDPOINTS:", listEndpoints(app));
}

// Manejador global de errores
app.use(errorHandler);

export default app;
