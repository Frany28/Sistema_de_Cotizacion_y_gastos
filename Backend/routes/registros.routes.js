import express from "express";
import {
  getDatosRegistro,
  createRegistro,
  generarVistaPreviaCotizacion,
  getTiposGasto,
} from "../controllers/registros.controller.js";

// Importamos el middleware de autenticación / permisos
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificaPermisoDinamico } from "../Middleware/verificarPermisoDinamico.js";
import { validarRegistro } from "../Middleware/validarRegistro.js";

// Importamos el middleware que sube a S3:
// (asegúrate de que la ruta relativa coincide con tu estructura de carpetas)
import { uploadComprobante } from "../utils/s3.js";

const router = express.Router();

// 1) Obtener datos (servicios, clientes, proveedores, tiposRegistro)
router.get("/", autenticarUsuario, getDatosRegistro);

router.post(
  "/",
  autenticarUsuario,
  verificaPermisoDinamico,
  validarRegistro,
  uploadComprobante.single("comprobante"),
  createRegistro
);

// 3) Vista previa de cotización (PDF)
router.post(
  "/cotizaciones/vista-previa",
  autenticarUsuario,
  generarVistaPreviaCotizacion
);

// 4) Obtener tipos de gasto (para llenar dropdowns)
router.get("/tipos-gasto", autenticarUsuario, getTiposGasto);

export default router;
