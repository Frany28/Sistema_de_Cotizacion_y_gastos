import express from "express";
import {
  listaCuentasPorCobrar,
  clientesConCXC,
  getTotalesPorCliente,
  getSaldoCuenta,
} from "../controllers/cxc.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verCuentasPorCobrar"),
  listaCuentasPorCobrar
);
router.get("/clientes", clientesConCXC);
router.get("/totales/:cliente_id", getTotalesPorCliente);
router.get(
  "/cuentas/:cuenta_id/saldo",
  verificarPermiso("registrarAbonoCliente"),
  getSaldoCuenta
);

export default router;
