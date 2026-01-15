import express from "express";
import {
  crearUsuario,
  actualizarUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  cambiarEstadoUsuario,
} from "../controllers/usuarios.controller.js";

import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import { uploadFirma } from "../middlewares/uploadFirma.js";

const router = express.Router();

// Listar usuarios
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verUsuarios"),
  obtenerUsuarios
);

// Obtener usuario por ID
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("verUsuarios"),
  obtenerUsuarioPorId
);

// Crear usuario (ADMIN o permiso explícito)
router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("crearUsuario"),
  uploadFirma.single("firma"),
  crearUsuario
);

// Actualizar usuario (ADMIN o permiso explícito)
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarUsuario"),
  uploadFirma.single("firma"),
  actualizarUsuario
);

// Cambiar estado (activar / desactivar)
router.patch(
  "/:id/estado",
  autenticarUsuario,
  verificarPermiso("editarUsuario"),
  cambiarEstadoUsuario
);

export default router;
