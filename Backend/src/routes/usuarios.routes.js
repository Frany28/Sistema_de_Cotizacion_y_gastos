import express from "express";
import multer from "multer";

import {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario,
} from "../controllers/usuarios.controller.js";

import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

// Configuración de subida (si ya la tienes en otro archivo, reutilízala)
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

/**
 * Listar usuarios
 * Permiso real en BD: administrarUsuarios
 */
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("administrarUsuarios"),
  obtenerUsuarios
);

/**
 * Ver detalle de usuario
 * Permiso real en BD: administrarUsuarios
 */
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("administrarUsuarios"),
  obtenerUsuarioPorId
);

/**
 * Crear usuario
 * Permiso real en BD: crearUsuario
 */
router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("crearUsuario"),
  upload.single("firma"),
  crearUsuario
);

/**
 * Editar usuario
 * Permiso real en BD: editarUsuario
 */
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarUsuario"),
  upload.single("firma"),
  actualizarUsuario
);

/**
 * Eliminar usuario
 * Permiso real en BD: eliminarUsuario
 */
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarUsuario"),
  eliminarUsuario
);

export default router;
