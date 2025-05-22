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

// Listar cotizaciones paginadas
router.get("/", getCotizaciones);

// Buscar por código o cliente
// Ej: /api/cotizaciones/buscar?q=Juan
router.get("/buscar", buscarCotizaciones);

// Obtener una cotización por ID
router.get("/:id", getCotizacionById);

// Generar PDF de la cotización
router.get("/:id/pdf", generarPDFCotizacion);

// Editar cotización completa (requiere validación)
router.put("/:id", validarCotizacion, editarCotizacion);

// Actualizar solo el estado de la cotización
router.patch("/:id/estado", actualizarEstadoCotizacion);

// Eliminar cotización
router.delete("/:id", deleteCotizacion);

export default router;
