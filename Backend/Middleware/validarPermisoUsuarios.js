// middlewares/validarPermisoUsuarios.js
import db from "../config/database.js";

/**
 * Middleware para verificar un permiso específico de usuario.
 * Uso: router.post('/ruta', validarPermisoUsuarios('clave_permiso'), controlador);
 */
export const validarPermisoUsuarios = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      // 1) Usuario autenticado en req.user
      const usuario = req.user;
      if (!usuario?.id) {
        return res.status(401).json({ message: "No has iniciado sesión" });
      }

      // 2) Traer los permisos asignados al usuario
      const [resultado] = await db.execute(
        `
        SELECT p.clave
          FROM usuarios u
          JOIN roles r ON u.rol_id = r.id
          JOIN roles_permisos rp ON r.id = rp.rol_id
          JOIN permisos p ON rp.permiso_id = p.id
         WHERE u.id = ?
        `,
        [usuario.id]
      );

      const permisosDelUsuario = resultado.map((p) => p.clave);

      // 3) Comprobar si el permiso requerido está en la lista
      if (!permisosDelUsuario.includes(permisoRequerido)) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para esta acción" });
      }

      next();
    } catch (error) {
      console.error("Error en validación de permisos de usuario:", error);
      res.status(500).json({ message: "Error interno al verificar permisos" });
    }
  };
};
