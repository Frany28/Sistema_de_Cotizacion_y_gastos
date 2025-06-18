import express from "express";
import {
  crearServicioProducto,
  obtenerServiciosProductos,
  actualizarServicioProducto,
  eliminarServicioProducto,
  verificarServicioProductoExistente,
  restarCantidadProducto,
  getServicioProductoById,
} from "../controllers/servicios_productos.controller.js";

import { validarServicioProducto } from "../Middleware/validarServicioProducto.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
const router = express.Router();

// Rutas para servicios y productos
router.post(
  "/",
  validarServicioProducto,
  crearServicioProducto,
  autenticarUsuario,
  verificarPermiso("crearServicio")
);

// Rutas para editar y eliminar servicios y productos
router.put(
  "/:id",
  validarServicioProducto,
  actualizarServicioProducto,
  autenticarUsuario,
  verificarPermiso("editarServicio")
);

// Ruta para restar cantidad de un producto
router.put("/restar/:id", restarCantidadProducto);

// Rutas para obtener servicios y productos
router.get(
  "/",
  obtenerServiciosProductos,
  autenticarUsuario,
  verificarPermiso("verServicios")
);

// Ruta para verificar si un servicio o producto ya existe
router.get("/check", verificarServicioProductoExistente);

// Ruta para obtener un servicio o producto por ID
router.get("/:id", getServicioProductoById);

// Ruta para eliminar un servicio o producto
router.delete(
  "/:id",
  eliminarServicioProducto,
  autenticarUsuario,
  verificarPermiso("eliminarServicio")
);

export default router;
