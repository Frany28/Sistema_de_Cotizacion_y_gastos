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

const router = express.Router();

router.get("/", getCotizaciones);
router.get("/:id", getCotizacionById);
router.get("/:id/pdf", generarPDFCotizacion);
router.put("/:id", validarCotizacion, editarCotizacion);
router.delete("/:id", deleteCotizacion);
router.put("/:id/estado", actualizarEstadoCotizacion);
router.get("/api/cotizaciones/buscar", buscarCotizaciones);

export default router;
