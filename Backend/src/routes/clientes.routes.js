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
// routes/clientes.routes.js
router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("crearCliente"),
  validarCliente,
  crearCliente
);

router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarCliente"),
  validarCliente,
  actualizarCliente
);

router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verClientes"),
  obtenerClientes
);
router.get("/check", verificarClienteExistente);

router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarCliente"),
  eliminarCliente
);

export default router;
