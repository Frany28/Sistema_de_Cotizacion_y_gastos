// routes/cotizaciones.routes.js
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

// Primero las rutas fijas
router.get("/buscar", buscarCotizaciones);

// Luego las demás
router.get("/", getCotizaciones);
router.get("/:id", getCotizacionById);
router.get("/:id/pdf", generarPDFCotizacion);
router.put("/:id", validarCotizacion, editarCotizacion);
router.put("/:id/estado", actualizarEstadoCotizacion);
router.delete("/:id", deleteCotizacion);

export default router;
