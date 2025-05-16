import express from "express";
import { login } from "../controllers/auth.controller.js";

const router = express.Router();

// ✅ Verificar si hay sesión activa
router.get("/verificar-sesion", (req, res) => {
  if (req.session?.usuario) {
    res.json({ message: "Sesión activa", usuario: req.session.usuario });
  } else {
    res.status(401).json({ message: "Sesión no activa" });
  }
});

// ✅ Iniciar sesión
router.post("/login", login);

// ✅ Cerrar sesión
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error al cerrar sesión" });
    }

    // Eliminar cookie de sesión
    res.clearCookie("connect.sid");
    res.json({ message: "Sesión cerrada correctamente" });
  });
});

export default router;
