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

const router = express.Router();

router.post("/", validarServicioProducto, crearServicioProducto);
router.put("/:id", validarServicioProducto, actualizarServicioProducto);
router.put("/restar/:id", restarCantidadProducto);
router.get("/", obtenerServiciosProductos);
router.get("/check", verificarServicioProductoExistente);
router.get("/:id", getServicioProductoById);
router.delete("/:id", eliminarServicioProducto);

export default router;
