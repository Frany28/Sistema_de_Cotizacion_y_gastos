// routes/almacenamiento.js
import express from "express";
import { obtenerUsoAlmacenamiento } from "../controllers/almacenamiento.controller.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";

const router = express.Router();

router.get("/mi-uso", autenticarUsuario, obtenerUsoAlmacenamiento);

export default router;
