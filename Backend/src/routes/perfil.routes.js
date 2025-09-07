// src/routes/perfil.routes.js
import express from "express";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import {
  obtenerTarjetaUsuario,
  listarArchivosRecientesUsuario,
  obtenerEstadisticasAlmacenamiento,
} from "../controllers/perfil.controller.js";

const router = express.Router();

/* Tarjeta de usuario + storage */
router.get("/tarjeta", autenticarUsuario, obtenerTarjetaUsuario);

/* Archivos recientes del usuario */
router.get("/recientes", autenticarUsuario, listarArchivosRecientesUsuario);

router.get(
  "/estadisticas",
  autenticarUsuario,
  obtenerEstadisticasAlmacenamiento
);

export default router;
