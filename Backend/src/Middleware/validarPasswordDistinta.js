// src/middleware/validarPasswordDistinta.js
import db from "../config/database.js";
import bcrypt from "bcrypt";

export const validarPasswordDistinta = async (req, res, next) => {
  const { password } = req.body;
  const { id } = req.params;

  // Si no viene password, no hay nada que validar aquí
  if (!password) return next();

  try {
    // 1) Obtener hash actual
    const [[{ password: hashActual } = {}] = []] = await db.query(
      `SELECT password FROM usuarios WHERE id = ?`,
      [id]
    );

    // 2) Comparar
    const coincide = await bcrypt.compare(password, hashActual);
    if (coincide) {
      return res
        .status(400)
        .json({
          message: "La nueva contraseña debe ser diferente a la actual.",
        });
    }

    next();
  } catch (err) {
    console.error("Error validando contraseña distinta:", err);
    res.status(500).json({ message: "Error interno validando contraseña." });
  }
};
