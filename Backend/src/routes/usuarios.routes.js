// src/routes/solicitudes_pago.routes.js
import express from "express";
import {
  obtenerSolicitudesPago,
  obtenerSolicitudPagoPorId,
  actualizarSolicitudPago,
  cancelarSolicitudPago,
  pagarSolicitudPago,
} from "../controllers/solicitudesPago.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import { uploadComprobante } from "../utils/s3.js";

const router = express.Router();

// GET   /api/solicitudes-pago           → Listar todas
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("ver_solicitudes_pago"),
  obtenerSolicitudesPago
);

// GET   /api/solicitudes-pago/:id       → Detalle de una
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("ver_solicitudes_pago"),
  obtenerSolicitudPagoPorId
);

// PATCH /api/solicitudes-pago/:id       → Actualizar campos generales
router.patch(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editar_solicitud_pago"),
  actualizarSolicitudPago
);

// PATCH /api/solicitudes-pago/:id/cancelar
router.patch(
  "/:id/cancelar",
  autenticarUsuario,
  verificarPermiso("editar_solicitud_pago"),
  cancelarSolicitudPago
);

// PATCH /api/solicitudes-pago/:id/pagar
//    → Sube comprobante y marca como pagada
router.patch(
  "/:id/pagar",
  autenticarUsuario,
  verificarPermiso("pagar_solicitud_pago"),
  uploadComprobante.single("ruta_comprobante"),
  pagarSolicitudPago
);

export default router;
