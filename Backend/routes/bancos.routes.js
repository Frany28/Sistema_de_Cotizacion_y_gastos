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

router.post("/", validarBanco, crearBanco);
router.get("/", obtenerBancos);
router.get("/:id", obtenerBancoPorId);
router.put("/:id", validarBanco, actualizarBanco);
router.delete("/:id", eliminarBanco);

export default router;
