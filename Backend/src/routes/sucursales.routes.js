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
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
const router = express.Router();

// CRUD básico
router.post(
  "/",
  validarSucursal,
  crearSucursal,
  autenticarUsuario,
  verificarPermiso("crearSucursal")
); // Crear nueva sucursal
router.get(
  "/",
  obtenerSucursales,
  autenticarUsuario,
  verificarPermiso("verSucursales")
); // Obtener todas las sucursales (paginadas)
router.get("/:id", obtenerSucursal); // Obtener una sucursal específica

router.put(
  "/:id",
  validarSucursal,
  actualizarSucursal,
  autenticarUsuario,
  verificarPermiso("editarSucursal")
); // Actualizar sucursal
router.delete(
  "/:id",
  eliminarSucursal,
  autenticarUsuario,
  verificarPermiso("eliminarSucursal")
); // Eliminar sucursal

// Rutas adicionales
router.get("/dropdown/list", obtenerSucursalesDropdown); // Para selects/opciones

export default router;
