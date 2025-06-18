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
import { uploadComprobantePago } from "../utils/s3.js";

const router = express.Router();

// GET   /api/solicitudes-pago
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("ver_solicitudes_pago"),
  obtenerSolicitudesPago
);

// GET   /api/solicitudes-pago/:id
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("ver_solicitudes_pago"),
  obtenerSolicitudPagoPorId
);

// PATCH /api/solicitudes-pago/:id
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
router.patch(
  "/:id/pagar",
  autenticarUsuario,
  verificarPermiso("pagar_solicitud_pago"),
  uploadComprobantePago.single("comprobante"),
  pagarSolicitudPago
);

export default router;
