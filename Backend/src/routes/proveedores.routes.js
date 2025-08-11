// src/routes/proveedores.routes.js
import express from "express";
import {
  crearProveedor,
  obtenerProveedores,
  actualizarProveedor,
  eliminarProveedor,
  verificarProveedorExistente,
  buscarProveedores,
} from "../controllers/proveedores.controller.js";

import { validarProveedor } from "../Middleware/validarProveedor.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

// ──────────────── POST ────────────────
router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("crearProveedor"),
  validarProveedor,
  crearProveedor
);

// ──────────────── PUT ─────────────────
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarProveedor"),
  validarProveedor,
  actualizarProveedor
);

// ──────────────── DELETE ──────────────
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarProveedor"),
  eliminarProveedor
);

// ──────────────── GETs ────────────────
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verProveedores"),
  obtenerProveedores
);

router.get(
  "/check",
  autenticarUsuario,
  verificarPermiso("verProveedores"),
  verificarProveedorExistente
);

router.get(
  "/buscar",
  autenticarUsuario,
  verificarPermiso("verProveedores"),
  buscarProveedores
);

export default router;
