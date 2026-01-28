import express from "express";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import {
  crearCarpeta,
  listarCarpetas,
  obtenerCarpetaPorId,
  renombrarCarpeta,
  moverCarpeta,
  enviarCarpetaAPapelera,
  restaurarCarpeta,
  borrarDefinitivoCarpeta,
  
} from "../controllers/carpetasArchivos.controller.js";

const router = express.Router();

// Listar carpetas (activa / papelera / borrado por query)
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarCarpetas,
);

// Obtener carpeta por ID
router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  obtenerCarpetaPorId,
);

// Crear carpeta
router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  crearCarpeta,
);

// Renombrar carpeta
router.put(
  "/:id/renombrar",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  renombrarCarpeta,
);

// Mover carpeta
router.put(
  "/:id/mover",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  moverCarpeta,
);

// Enviar a papelera
router.put(
  "/:id/papelera",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  enviarCarpetaAPapelera,
);

// Restaurar de papelera
router.put(
  "/:id/restaurar",
  autenticarUsuario,
  verificarPermiso("restaurarArchivos"),
  restaurarCarpeta,
);

// Borrado definitivo (solo si está en papelera)
router.delete(
  "/:id/borrado-definitivo",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  borrarDefinitivoCarpeta,
);

export default router;
