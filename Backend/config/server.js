import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import fs from "fs";
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
import solicitudesPagoRoutes from "../routes/solicitudesPago.routes.js";

// Variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();

// Configuración de CORS y session
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:10000", // Frontend local
  process.env.FRONTEND_URL, // URL en producción
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("CORS origin not allowed: " + origin));
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Middleware global
app.use(logger);
app.use(express.json());

// Servir archivos estáticos de frontend (build o dist)
const staticPath = path.join(__dirname, "../dist");
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// Rutas de la API
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicios-productos", serviciosProductosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/cotizaciones", cotizacionesRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/solicitudes-pago", solicitudesPagoRoutes);

// Manejador de errores
app.use(errorHandler);

// Mostrar endpoints en desarrollo
if (process.env.NODE_ENV !== "production") {
  console.log("ENDPOINTS:", listEndpoints(app));
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
