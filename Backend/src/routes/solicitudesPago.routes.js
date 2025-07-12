// src/routes/solicitudes_pago.routes.js
import express from "express";
import {
  obtenerSolicitudesPago,
  obtenerSolicitudPagoPorId,
  actualizarSolicitudPago,
  cancelarSolicitudPago,
  pagarSolicitudPago,
  generarPDFSolicitudPago,
} from "../controllers/solicitudesPago.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import { uploadComprobantePago } from "../utils/s3.js";
import { validarCuota } from "../Middleware/validarCuota.js";

const router = express.Router();

// GET   /api/solicitudes-pago
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verSolicitudesPago"),
  obtenerSolicitudesPago
);

router.get("/:id/pdf", generarPDFSolicitudPago);

// GET   /api/solicitudes-pago/:id
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("verSolicitudesPago"),
  obtenerSolicitudPagoPorId
);

// PATCH /api/solicitudes-pago/:id
router.patch(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarSolicitudPago"),
  actualizarSolicitudPago
);

// PATCH /api/solicitudes-pago/:id/cancelar
router.patch(
  "/:id/cancelar",
  autenticarUsuario,
  verificarPermiso("editarSolicitudPago"),
  cancelarSolicitudPago
);

// PATCH /api/solicitudes-pago/:id/pagar
router.patch(
  "/:id/pagar",
  autenticarUsuario,
  verificarPermiso("pagarSolicitudPago"),
  validarCuota,
  uploadComprobantePago.single("comprobante"),
  pagarSolicitudPago
);

export default router;
