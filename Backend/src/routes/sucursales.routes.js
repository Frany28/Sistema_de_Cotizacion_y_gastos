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

router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("crearSucursal"),
  validarSucursal,
  crearSucursal
);

router.get(
  "/",
  obtenerSucursales,
  autenticarUsuario,
  verificarPermiso("verSucursales")
); // Obtener todas las sucursales (paginadas)
router.get("/:id", obtenerSucursal); // Obtener una sucursal específica

router.patch(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarSucursal"),
  actualizarSucursal
); // Actualizar sucursal

router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarSucursal"),
  eliminarSucursal
); // Eliminar sucursal

// Rutas adicionales
router.get("/dropdown/list", obtenerSucursalesDropdown); // Para selects/opciones

export default router;
