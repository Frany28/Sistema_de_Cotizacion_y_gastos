// routes/usuarios.routes.js
import express from "express";
import db from "../config/database.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { uploadFirma } from "../utils/s3.js"; // ⬅️ usar el uploader correcto para firmas
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  actualizarCuotaUsuario,
  eliminarUsuario,
} from "../controllers/usuarios.controller.js";

const router = express.Router();

/**
 * Middleware local (para no depender de rutas/paths externos)
 * Admin (rol_id === 1) pasa directo.
 */
const verificarPermiso = (clave) => {
  return async (req, res, next) => {
    try {
      const usuario = req.usuario;
      if (!usuario) return res.status(401).json({ message: "No autenticado" });

      // Admin sin restricciones
      if (Number(usuario.rol_id) === 1) return next();

      const [rows] = await db.query(
        `SELECT 1
         FROM roles_permisos rp
         JOIN permisos p ON p.id = rp.permiso_id
         WHERE rp.rol_id = ? AND p.nombre = ?
         LIMIT 1`,
        [usuario.rol_id, clave]
      );

      if (!rows.length) {
        return res.status(403).json({ message: "No tienes permiso" });
      }

      return next();
    } catch (error) {
      console.error("Error al verificar permiso:", error);
      return res
        .status(500)
        .json({ message: "Error interno al verificar permiso" });
    }
  };
};

// Listado y detalle
router.get("/", autenticarUsuario, obtenerUsuarios);
router.get("/:id", autenticarUsuario, obtenerUsuarioPorId);

// Crear
router.post("/", autenticarUsuario, uploadFirma.single("firma"), crearUsuario);

// Actualizar usuario (datos generales)
router.put(
  "/:id",
  autenticarUsuario,
  uploadFirma.single("firma"), // ⬅️ antes: uploadComprobante
  actualizarUsuario
);

// ✅ Editar cuota de almacenamiento (opción 1)
router.put(
  "/:id/cuota",
  autenticarUsuario,
  verificarPermiso("editar_cuota_usuario"),
  actualizarCuotaUsuario
);

// Eliminar
router.delete("/:id", autenticarUsuario, eliminarUsuario);

/**
 * Endpoint usado por frontend para saber si el usuario logueado
 * tiene un permiso específico.
 */
router.get("/permisos/:clave", autenticarUsuario, async (req, res) => {
  try {
    const usuario = req.usuario;
    const { clave } = req.params;

    // Admin siempre true
    if (Number(usuario.rol_id) === 1) {
      return res.json({ tienePermiso: true });
    }

    const [rows] = await db.query(
      `SELECT 1
         FROM roles_permisos rp
         JOIN permisos p ON p.id = rp.permiso_id
        WHERE rp.rol_id = ? AND p.nombre = ?
        LIMIT 1`,
      [usuario.rol_id, clave]
    );

    res.json({ tienePermiso: rows.length > 0 });
  } catch (error) {
    console.error("Error al verificar permiso (frontend):", error);
    res.status(500).json({ message: "Error interno al verificar permiso" });
  }
});

export default router;
