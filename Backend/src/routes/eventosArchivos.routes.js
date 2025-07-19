// routes/eventosArchivos.routes.js
import { Router } from "express";
import {
  listarEventosArchivos,
  contarVersionesDelMes,
  obtenerAlmacenamientoTotal,
} from "../controllers/eventosArchivos.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = Router();
router.get(
  "/",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  listarEventosArchivos
);

router.get(
  "/:id/versiones-del-mes",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  contarVersionesDelMes
);

router.get(
  "/:id/almacenamiento-total",
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  obtenerAlmacenamientoTotal
);

export default router;
