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

const router = express.Router();

router.post("/", validarProveedor, crearProveedor);
router.get("/", obtenerProveedores);
router.get("/check", verificarProveedorExistente);
router.put("/:id", validarProveedor, actualizarProveedor);
router.delete("/:id", eliminarProveedor);
router.get("/buscar", buscarProveedores);

export default router;
