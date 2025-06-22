import express from "express";
import {
  getDatosRegistro,
  createRegistro,
  generarVistaPreviaCotizacion,
  getTiposGasto,
} from "../controllers/registros.controller.js";

import { validarRegistro } from "../Middleware/validarRegistro.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificaPermisoDinamico } from "../Middleware/verificarPermisoDinamico.js";
import { subirComprobanteGasto } from "../controllers/registroArchivo.controller.js";

const router = express.Router();

router.get("/", autenticarUsuario, getDatosRegistro);

router.post(
  "/",
  autenticarUsuario,
  verificaPermisoDinamico,
  uploadComprobante.single("documento"), // ← aquí Multer‐S3
  validarRegistro,
  createRegistro
);

// Ruta para subir el comprobante de un gasto ya creado
router.post(
  "/:id/comprobante",
  autenticarUsuario,
  verificaPermisoDinamico,
  uploadComprobante.single("documento"),
  subirComprobanteGasto
);

router.post(
  "/",
  (req, _res, next) => {
    req.combinedData = {
      ...req.body,
      ...(req.file ? { documento: req.file } : {}),
    };
    next();
  },
  autenticarUsuario,
  verificaPermisoDinamico,
  validarRegistro,
  createRegistro
);

router.post(
  "/cotizaciones/vista-previa",
  autenticarUsuario,
  generarVistaPreviaCotizacion
);

router.get("/tipos-gasto", autenticarUsuario, getTiposGasto);

export default router;
