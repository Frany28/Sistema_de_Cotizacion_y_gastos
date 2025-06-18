import express from "express";
import {
  getCotizaciones,
  getCotizacionById,
  editarCotizacion,
  actualizarEstadoCotizacion,
  generarPDFCotizacion,
  deleteCotizacion,
  buscarCotizaciones,
} from "../controllers/cotizaciones.controller.js";

import { validarCotizacion } from "../Middleware/validarCotizacion.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

router.get(
  "/",
  getCotizaciones,
  autenticarUsuario,
  verificarPermiso("verCotizaciones")
);
router.get(
  "/:id",
  getCotizacionById,
  autenticarUsuario,
  verificarPermiso("verCotizacion")
);
router.get("/:id/pdf", generarPDFCotizacion);
router.put(
  "/:id",
  validarCotizacion,
  editarCotizacion,
  verificarPermiso("editarCotizacion"),
  autenticarUsuario
);
router.delete(
  "/:id",
  deleteCotizacion,
  autenticarUsuario,
  verificarPermiso("eliminarCotizacion")
);
router.put(
  "/:id/estado",
  actualizarEstadoCotizacion,
  verificarPermiso("aprobarCotizacion")
);
router.get("/api/cotizaciones/buscar", buscarCotizaciones);

export default router;
