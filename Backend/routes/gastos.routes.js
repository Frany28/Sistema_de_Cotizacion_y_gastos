// routes/gastos.routes.js
import express from "express";
import {
  getGastos,
  getGastoById,
  updateGasto,
  deleteGasto,
  getProveedores,
  actualizarEstadoGasto,
  getTiposGasto,
} from "../controllers/gastos.controller.js";

import { validarGasto } from "../Middleware/validarGasto.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import {
  verificarPermiso,
  scopeEdicionGasto,
} from "../Middleware/verificarPermiso.js";

const router = express.Router();


// Rutas públicas
router.get("/proveedores", getProveedores);
router.get("/tipos", getTiposGasto);

// Rutas protegidas
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("ver_gastos"), // Cambiamos el permiso para ver gastos, no reportes
  getGastos
);

// Obtener un gasto específico
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("ver_gastos"),
  getGastoById
);

// Actualizar un gasto
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editar_gasto"),
  scopeEdicionGasto,
  validarGasto,
  updateGasto
);

// Cambiar estado de un gasto
router.put(
  "/:id/estado",
  autenticarUsuario,
  verificarPermiso("aprobar_gasto"),
  actualizarEstadoGasto
);

// Eliminar un gasto
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminar_gasto"),
  deleteGasto
);

export default router;
