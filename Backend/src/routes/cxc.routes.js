import express from "express";
import {
  listaCuentasPorCobrar,
  clientesConCXC,
  getTotalesPorCliente,
  getSaldoCuenta,
} from "../controllers/cxc.controller.js";

const router = express.Router();

router.get("/", listaCuentasPorCobrar);
router.get("/clientes", clientesConCXC);
router.get("/totales/:cliente_id", getTotalesPorCliente);
router.get("/cuentas/:cuenta_id/saldo", getSaldoCuenta);

export default router;
