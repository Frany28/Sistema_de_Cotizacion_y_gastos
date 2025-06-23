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

const router = express.Router();

router.get("/", autenticarUsuario, getDatosRegistro);

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
