// src/routes/cxc.routes.js

import express from "express";
import { uploadComprobanteAbono } from "../utils/s3.js";

import {
  listaCuentasPorCobrar,
  clientesConCXC,
  getTotalesPorCliente,
  getSaldoCuenta,
  registrarAbono,
} from "../controllers/cxc.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

// Registrar abono con comprobante
router.post(
  "/:cuenta_id/abonos",
  autenticarUsuario,
  verificarPermiso("registrarAbonoCliente"),
  uploadComprobanteAbono.single("comprobante"),
  registrarAbono
);

// Listar cuentas por cobrar
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verCuentasPorCobrar"),
  listaCuentasPorCobrar
);

// Obtener clientes con CxC
router.get("/clientes", clientesConCXC);

// Totales por cliente
router.get("/totales/:cliente_id", getTotalesPorCliente);

// **Saldo pendiente de una cuenta: ahora protegida**
router.get(
  "/:cuenta_id/saldo",
  autenticarUsuario,
  verificarPermiso("registrarAbonoCliente"),
  getSaldoCuenta
);

export default router;
