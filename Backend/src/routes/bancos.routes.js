import express from "express";
import {
  crearBanco,
  obtenerBancos,
  obtenerBancoPorId,
  actualizarBanco,
  eliminarBanco,
} from "../controllers/bancos.controller.js";

import { validarBanco } from "../Middleware/validarBanco.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

// Listar → sólo autenticado
router.get(
  "/",
  verificarPermiso(), // sin argumento valida sólo sesión
  obtenerBancos
);

// Crear → permiso 'crear_banco'
router.post("/", verificarPermiso("crear_banco"), validarBanco, crearBanco);

// Detalle → sólo autenticado
router.get("/:id", verificarPermiso(), obtenerBancoPorId);

// Editar → permiso 'editar_banco'
router.put(
  "/:id",
  verificarPermiso("editar_banco"),
  validarBanco,
  actualizarBanco
);

// Borrar → permiso 'eliminar_banco'
router.delete("/:id", verificarPermiso("eliminar_banco"), eliminarBanco);

export default router;
