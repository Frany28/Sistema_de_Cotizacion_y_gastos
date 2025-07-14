// routes/eventosArchivos.routes.js
import { Router } from "express";
import { listarEventosArchivos } from "../controllers/eventosArchivos.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = Router();

/*  /api/archivos/eventos  →  GET   (app.js hace el prefix) */
router.get(
  "/", 
  autenticarUsuario,
  verificarPermiso("verEventosArchivos"),
  listarEventosArchivos
);

export default router;
