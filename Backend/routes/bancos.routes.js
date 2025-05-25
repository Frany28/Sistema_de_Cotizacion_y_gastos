// routes/bancos.routes.js
import express from "express";
import {
  crearBanco,
  obtenerBancos,
  obtenerBancoPorId,
  actualizarBanco,
  eliminarBanco,
} from "../controllers/bancos.controller.js";
import { validarBanco } from "../Middleware/validarBanco.js";

const router = express.Router();

// Crear
router.post("/", validarBanco, crearBanco);

// Listar (con filtros opcionales ?tipo_identificador=&estado=)
router.get("/", obtenerBancos);

// Obtener uno
router.get("/:id", obtenerBancoPorId);

// Actualizar
router.put("/:id", validarBanco, actualizarBanco);

// Eliminar
router.delete("/:id", eliminarBanco);

export default router;
