// routes/clientes.routes.js
import express from "express";
import {
  crearCliente,
  obtenerClientes,
  actualizarCliente,
  eliminarCliente,
  verificarClienteExistente,
} from "../controllers/clientes.controller.js";

import { validarCliente } from "../Middleware/validarCliente.js";

const router = express.Router();

router.post("/", validarCliente, crearCliente);
router.put("/:id", validarCliente, actualizarCliente);

router.get("/", obtenerClientes);
router.get("/check", verificarClienteExistente);
router.delete("/:id", eliminarCliente);

export default router;
