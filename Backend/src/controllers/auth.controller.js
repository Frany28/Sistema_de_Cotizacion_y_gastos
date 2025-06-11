// controllers/auth.controller.js
import db from "../config/database.js";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email y contraseña son obligatorios" });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM usuarios WHERE email = ? AND estado = 'activo'",
      [email]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Usuario no encontrado o inactivo" });
    }

    const usuario = rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Guardar datos esenciales en la sesión
    req.session.usuario = {
      id: usuario.id,
      rol_id: usuario.rol_id,
      nombre: usuario.nombre,
      email: usuario.email,
    };

    req.session.userId = usuario.id; // Asegurar que userId esté configurado

    // Verificar que la sesión se haya guardado correctamente
    req.session.save((err) => {
      if (err) {
        console.error("Error al guardar la sesión:", err);
        return res.status(500).json({ message: "Error al iniciar sesión" });
      }

      res.json({
        message: "Login exitoso",
        usuario: req.session.usuario,
      });
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ message: "Error interno al iniciar sesión" });
  }
};
