import express from "express";
import {
  crearProveedor,
  obtenerProveedores,
  actualizarProveedor,
  eliminarProveedor,
  verificarProveedorExistente,
  buscarProveedores,
} from "../controllers/proveedores.controller.js";

import { validarProveedor } from "../Middleware/validarProveedor.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

router.post(
  "/",
  validarProveedor,
  crearProveedor,
  autenticarUsuario,
  verificarPermiso("crearProveedor")
);
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verProveedores"),
  obtenerProveedores
);
router.get("/check", verificarProveedorExistente);
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarProveedor"),
  validarProveedor,
  actualizarProveedor
);
router.delete(
  "/:id",
  autenticarUsuario,
  validarProveedor("eliminarProveedor"),
  eliminarProveedor
);
router.get("/buscar", buscarProveedores);

export default router;
