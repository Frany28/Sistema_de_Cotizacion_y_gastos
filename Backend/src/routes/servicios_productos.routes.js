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
  autenticarUsuario,
  verificarPermiso("editarServicio"),
  validarServicioProducto,
  actualizarServicioProducto
);

// Ruta para restar cantidad de un producto
router.put("/restar/:id", restarCantidadProducto);

// Rutas para obtener servicios y productos
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verServicios"),
  obtenerServiciosProductos
);

// Ruta para verificar si un servicio o producto ya existe
router.get("/check", verificarServicioProductoExistente);

// Ruta para obtener un servicio o producto por ID
router.get("/:id", getServicioProductoById);

// Ruta para eliminar un servicio o producto
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarServicio"),
  eliminarServicioProducto
);

export default router;
