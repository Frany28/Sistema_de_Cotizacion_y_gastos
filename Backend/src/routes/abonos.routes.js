import express from "express";
import { registrarAbono } from "../controllers/abonos.controller.js";
import { validarAbono } from "../Middleware/validarAbono.js";

const router = express.Router();

router.post("/", validarAbono, registrarAbono);

export default router;
