// middlewares/verificarPermisoDinamico.js
import db from "../config/database.js";
import { autenticarUsuario } from "./autenticarUsuario.js";

// Middleware para verificar permisos dinámicos según tipo de registro (gasto o cotización)
export const verificaPermisoDinamico = [
  autenticarUsuario,
  async (req, res, next) => {
    // 1) Usuario autenticado en req.user
    const usuario = req.user;
    if (!usuario) {
      return res.status(401).json({ message: "No has iniciado sesión" });
    }

    // 2) Determinar permiso según tipo en el body
    const tipo = req.body?.tipo;
    const permisoClave =
      tipo === "gasto"
        ? "crear_gasto"
        : tipo === "cotizacion"
        ? "crear_cotizacion"
        : null;

    if (!permisoClave) {
      return res.status(400).json({ message: "Tipo de registro no válido" });
    }

    try {
      // 3) Obtener permisos del rol directamente por nombre (antes era clave)
      const [permisos] = await db.execute(
        `SELECT p.nombre
         FROM roles_permisos rp
         JOIN permisos p ON p.id = rp.permiso_id
         WHERE rp.rol_id = ?`,
        [usuario.rol_id]
      );

      // 4) Comprobar si existe el permiso requerido
      const tienePermiso = permisos.some((p) => p.nombre === permisoClave);
      if (!tienePermiso) {
        return res.status(403).json({
          message: "No tienes permiso para crear este tipo de registro",
        });
      }

      next();
    } catch (error) {
      console.error("Error al verificar permiso dinámico:", error);
      res.status(500).json({ message: "Error interno al verificar permisos" });
    }
  },
];
