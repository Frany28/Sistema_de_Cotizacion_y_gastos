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
  autenticarUsuario,
  verificarPermiso("verCotizacion"),
  getCotizacionById
);
router.get("/:id/pdf", generarPDFCotizacion);
router.put(
  "/:id",
  verificarPermiso("editarCotizacion"),
  autenticarUsuario,
  validarCotizacion,
  editarCotizacion
);
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarCotizacion"),
  deleteCotizacion
);
router.put(
  "/:id/estado",
  verificarPermiso("aprobarCotizacion"),
  autenticarUsuario,
  actualizarEstadoCotizacion
);
router.get("/api/cotizaciones/buscar", buscarCotizaciones);

export default router;
