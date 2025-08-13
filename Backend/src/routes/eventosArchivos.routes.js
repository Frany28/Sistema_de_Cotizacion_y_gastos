// routes/eventosArchivos.routes.js
import { Router } from "express";
import {
  // nuevas/renombradas
  obtenerMetricasTablero,
  obtenerTendenciaActividad,
  listarActividadReciente,
  contarVersionesDelMesPorArchivo,
  obtenerAlmacenamientoTotalPorDocumento,
} from "../controllers/eventosArchivos.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = Router();

/* === NUEVOS ENDPOINTS PARA EL DASHBOARD === */
// Tarjetas superiores (totales globales)
router.get(
  "/metricas",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerMetricasTablero
);

// Serie diaria para el gráfico de tendencia
router.get(
  "/tendencia",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerTendenciaActividad
);

/* === FEED PRINCIPAL (reemplaza listarEventosArchivos) === */
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  listarActividadReciente
);

/* === UTILIDADES POR ARCHIVO (mismas rutas, nuevas funciones) === */
router.get(
  "/:id/versiones-del-mes",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  contarVersionesDelMesPorArchivo
);

router.get(
  "/:id/almacenamiento-total",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerAlmacenamientoTotalPorDocumento
);

export default router;
