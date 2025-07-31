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
  eliminarDefinitivoArchivo,
  sustituirArchivo,
  obtenerDetallesArchivo,
  contarVersionesArchivo,
  listarArchivosEliminados,
  listarVersionesPorGrupo,
  purgarPapelera,
} from "../controllers/archivos.controller.js";

const router = express.Router();

/*─────────────────────── Árbol y subida ───────────────────────*/
router.get(
  "/arbol",
  autenticarUsuario,
  verificarPermiso("listarArchivos"),
  obtenerArbolArchivos
);

router.put(
  "/sustituir/:registroTipo/:registroId",
  autenticarUsuario,
  uploadGeneric.single("archivo"),
  sustituirArchivo
);

/*─────────────────────── Descargas ────────────────────────────*/
router.get(
  "/descargar/:id",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  descargarArchivo
);

router.get(
  "/version/:versionId/descargar",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  descargarVersion
);

/*─────────────────────── Listados ─────────────────────────────*/
router.get("/papelera", autenticarUsuario, listarArchivosEliminados);

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

router.get(
  "/detalle/:id",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  obtenerDetallesArchivo
);

/*─────────────────────── Eliminación / Restauración ───────────*/
// Soft-delete (mover a papelera)
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarArchivo
);

// src/routes/archivos.routes.js
router.delete(
  "/papelera/purgar",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  purgarPapelera
);

// Restaurar archivo desde papelera
router.post(
  "/:id/restaurar",
  autenticarUsuario,
  verificarPermiso("restaurarArchivos"),
  restaurarArchivo
);

router.delete(
  "/papelera/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarDefinitivoArchivo
);

// Fallback global (solo-Admin) —mantener si lo usas en otras vistas
router.delete(
  "/eliminar-definitivo/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarDefinitivamente
);

/*─────────────────────── Versiones ────────────────────────────*/
router.get("/:id/total-versiones", autenticarUsuario, contarVersionesArchivo);

router.get(
  "/:id/versiones",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarHistorialVersiones
);

router.post(
  "/version/:versionId/restaurar",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  restaurarVersion
);

export default router;
