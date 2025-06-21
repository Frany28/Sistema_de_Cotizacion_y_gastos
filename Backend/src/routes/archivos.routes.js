import express from "express";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import { uploadComprobante } from "../utils/s3.js";
import {
  descargarArchivo,
  listarArchivos,
  eliminarArchivo,
  restaurarArchivo,
  registrarEvento,
  listarHistorialVersiones,
  descargarVersion,
  restaurarVersion,
  eliminarDefinitivamente,
  obtenerTiposArchivosUsuario,
  sustituirArchivo,
} from "../controllers/archivos.controller.js";

const router = express.Router();

router.get("/mis-tipos", autenticarUsuario, obtenerTiposArchivosUsuario);
// rutas/archivos.routes.js
router.put(
  "/sustituir/:registroTipo/:registroId",
  autenticarUsuario,
  uploadGeneric.single("archivo"),
  sustituirArchivo
);

router.get(
  "/descargar/:id",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  descargarArchivo
);

router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarArchivos
);

router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarArchivo
);

router.post(
  "/:id/restaurar",
  autenticarUsuario,
  verificarPermiso("restaurarArchivos"),
  restaurarArchivo
);

router.post(
  "/eventos",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  registrarEvento
);

router.get(
  "/:archivoId/versiones",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  listarHistorialVersiones
);

router.get(
  "/version/:versionId/descargar",
  autenticarUsuario,
  verificarPermiso("verArchivos"),
  descargarVersion
);

router.post(
  "/versiones/restaurar",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  restaurarVersion
);

router.post(
  "/versiones/restaurar",
  autenticarUsuario,
  verificarPermiso("editarArchivos"),
  restaurarVersion
);

router.delete(
  "/eliminar-definitivo/:id",
  autenticarUsuario,
  verificarPermiso("eliminarArchivos"),
  eliminarDefinitivamente
);

export default router;
