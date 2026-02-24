// middlewares/autenticarUsuario.js
import db from "../config/database.js";

export const autenticarUsuario = async (req, res, next) => {
  try {
    // 1) Validar sesión
    const { session } = req;
    if (!session?.userId) {
      return res.status(401).json({ message: "No has iniciado sesión" });
    }

    // 2) Refrescar userId en sesión (por si acaso)
    const userId = session.userId;
    req.session.userId = userId;

    // 3) Traer datos del usuario de la BD
    const [[usuario]] = await db.execute(
      `SELECT id, nombre, email, rol_id, firma
         FROM usuarios
        WHERE id = ? AND estado = 'activo'`,
      [userId],
    );
    if (!usuario) {
      return res.status(401).json({ message: "Usuario inválido o inactivo" });
    }

    // 4) Poblar req.user (única fuente de verdad para el usuario autenticado)
    req.user = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol_id: usuario.rol_id,
      firma: usuario.firma, // p.ej. "/uploads/firmas/1747165769476-firma.jpg"
    };

    next();
  } catch (error) {
    console.error("Error en autenticarUsuario:", error);
    res.status(500).json({ message: "Error interno de autenticación" });
  }
};
