// routes/eventosArchivos.routes.js
import { Router } from "express";
import {
  obtenerMetricasTablero,
  obtenerTendenciaActividad, // ← la serie diaria del gráfico
  listarActividadReciente,
  contarVersionesDelMesPorArchivo,
  obtenerAlmacenamientoTotalPorDocumento,
  obtenerContadoresTarjetas,
} from "../controllers/eventosArchivos.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = Router();

/* === Endpoints de tablero === */
router.get(
  "/metricas",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerMetricasTablero
);

// Serie diaria (el gráfico consume esta)
router.get(
  "/tendencia",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerTendenciaActividad
);

/* === Feed principal === */
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  listarActividadReciente
);

/* === Utilidades por archivo === */
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

router.get(
  "/contadores",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerContadoresTarjetas
);

export default router;
