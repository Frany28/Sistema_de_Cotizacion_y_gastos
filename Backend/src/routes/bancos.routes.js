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
  verificarPermiso(), 
  obtenerBancos
);

// Crear → permiso 'crear_banco'
router.post("/", verificarPermiso("crearBanco"), validarBanco, crearBanco);

// Detalle → sólo autenticado
router.get("/:id", verificarPermiso(), obtenerBancoPorId);

// Editar → permiso 'editar_banco'
router.put(
  "/:id",
  verificarPermiso("editarBanco"),
  validarBanco,
  actualizarBanco
);

// Borrar → permiso 'eliminar_banco'
router.delete("/:id", verificarPermiso("eliminarBanco"), eliminarBanco);

export default router;
