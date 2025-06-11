// routes/sucursales.routes.js
import express from "express";
import {
  crearSucursal,
  obtenerSucursales,
  obtenerSucursal,
  actualizarSucursal,
  eliminarSucursal,
  obtenerSucursalesDropdown,
} from "../controllers/sucurlales.controller.js";
import { validarSucursal } from "../Middleware/validarSucursal.js";

const router = express.Router();

// CRUD básico
router.post("/", validarSucursal, crearSucursal); // Crear nueva sucursal
router.get("/", obtenerSucursales); // Obtener todas las sucursales (paginadas)
router.get("/:id", obtenerSucursal); // Obtener una sucursal específica
router.put("/:id", validarSucursal, actualizarSucursal); // Actualizar sucursal
router.delete("/:id", eliminarSucursal); // Eliminar sucursal

// Rutas adicionales
router.get("/dropdown/list", obtenerSucursalesDropdown); // Para selects/opciones

export default router;
