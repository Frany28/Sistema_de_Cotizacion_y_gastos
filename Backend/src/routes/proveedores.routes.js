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
  obtenerProveedores,
  autenticarUsuario,
  verificarPermiso("verProveedores")
);
router.get("/check", verificarProveedorExistente);
router.put(
  "/:id",
  validarProveedor,
  actualizarProveedor,
  autenticarUsuario,
  verificarPermiso("editarProveedor")
);
router.delete("/:id", eliminarProveedor);
router.get("/buscar", buscarProveedores);

export default router;
