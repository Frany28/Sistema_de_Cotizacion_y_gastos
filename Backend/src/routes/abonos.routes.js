import express from "express";
import { registrarAbono } from "../controllers/abonos.controller.js";
import { validarAbono } from "../Middleware/validarAbono.js";

const router = express.Router();
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("registrarAbonoCliente"),
  validarAbono,
  registrarAbono
);

export default router;
