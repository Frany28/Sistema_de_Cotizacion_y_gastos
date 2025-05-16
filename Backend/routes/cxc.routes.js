import express from "express";
import {
  listaCuentasPorCobrar,
  clientesConCXC,
  getTotalesPorCliente
} from "../controllers/cxc.controller.js";

const router = express.Router();

router.get("/", listaCuentasPorCobrar);
router.get("/clientes", clientesConCXC);
router.get("/totales/:cliente_id", getTotalesPorCliente);

export default router;
