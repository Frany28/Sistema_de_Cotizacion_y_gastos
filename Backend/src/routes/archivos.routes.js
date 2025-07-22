// src/routes/archivos.routes.js
import express from "express";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import { uploadGeneric } from "../utils/s3.js";
import {
  obtenerArbolArchivos,
  descargarArchivo,
  listarArchivos,
  eliminarArchivo,
  restaurarArchivo,
  listarHistorialVersiones,
  descargarVersion,
  restaurarVersion,
  eliminarDefinitivamente,
  sustituirArchivo,
  obtenerDetallesArchivo,
  contarVersionesArchivo,
  listarArchivosEliminados,
  listarVersionesPorGrupo,
} from "../controllers/archivos.controller.js";

const router = express.Router();

router.get(
  "/arbol",
  autenticarUsuario,
  verificarPermiso("listarArchivos"),
  obtenerArbolArchivos
);

// Reemplazar (sustituir) un archivo existente
router.put(
  "/sustituir/:registroTipo/:registroId",
  autenticarUsuario,
  uploadGeneric.single("archivo"),
  sustituirArchivo
);

// Descargar archivo activo
router.get(
  "/descargar/:id",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  descargarArchivo
);

// Listar archivos eliminados (papelera)
router.get("/papelera", autenticarUsuario, listarArchivosEliminados);

// Listar archivos activos
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarArchivos
);

router.get(
  "/grupo/:grupoArchivoId/versiones",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarVersionesPorGrupo
);

// Obtener detalle de un archivo específico
router.get(
  "/detalle/:id",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  obtenerDetallesArchivo
);

// Eliminar archivo (soft delete)
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarArchivo
);

// Restaurar archivo desde papelera
router.post(
  "/:id/restaurar",
  autenticarUsuario,
  verificarPermiso("restaurarArchivos"),
  restaurarArchivo
);

// Listar versiones de un archivo
router.get("/:id/total-versiones", autenticarUsuario, contarVersionesArchivo);

// Listar historial de versiones de un archivo
router.get(
  "/:id/versiones",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarHistorialVersiones
);

// Descargar una versión específica
router.get(
  "/version/:versionId/descargar",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  descargarVersion
);

// Restaurar una versión específica
router.post(
  "/version/:versionId/restaurar",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  restaurarVersion
);

// Eliminar definitivamente (solo Admin)
router.delete(
  "/eliminar-definitivo/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarDefinitivamente
);

export default router;
