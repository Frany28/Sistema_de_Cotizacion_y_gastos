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
import { verificarPermiso } from "../Middleware/verificarPermiso.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";

const router = express.Router();
// Rutas para manejar clientes
//crear, obtener, actualizar, eliminar clientes
// y verificar si un cliente ya existe
router.post(
  "/",
  validarCliente,
  crearCliente,
  autenticarUsuario,
  verificarPermiso("crearCliente")
);

router.put(
  "/:id",
  validarCliente,
  actualizarCliente,
  autenticarUsuario,
  verificarPermiso("editarCliente")
);

router.get(
  "/",
  obtenerClientes,
  autenticarUsuario,
  verificarPermiso("verClientes")
);
router.get("/check", verificarClienteExistente);

router.delete(
  "/:id",
  eliminarCliente,
  autenticarUsuario,
  verificarPermiso("eliminarCliente")
);

export default router;
