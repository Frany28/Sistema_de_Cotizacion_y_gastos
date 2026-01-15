// routes/usuarios.routes.js
import express from "express";
import db from "../config/database.js";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { uploadFirma } from "../utils/s3.js";
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../controllers/usuarios.controller.js";
import { verificarPermiso } from "../Middleware/verificarPermiso.js";

const router = express.Router();

// Listado
router.get("/", autenticarUsuario, obtenerUsuarios);

// ✅ Verificar permiso por clave (SIN ruta fantasma, y antes de "/:id")
router.get("/permisos/:clave", autenticarUsuario, async (req, res) => {
  try {
    const { clave } = req.params;

    // autenticarUsuario llena req.user (Redis solo guarda la sesión)
    const usuario = req.user;

    if (!usuario) {
      return res.status(401).json({ message: "No has iniciado sesión" });
    }

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

    return res.json({ tienePermiso: rows.length > 0 });
  } catch (error) {
    console.error("Error al verificar permiso (frontend):", error);
    return res
      .status(500)
      .json({ message: "Error interno al verificar permiso" });
  }
});

// Detalle
router.get("/:id", autenticarUsuario, obtenerUsuarioPorId);

// Crear
router.post(
  "/",
  autenticarUsuario,
  verificarPermiso("crearUsuario"),
  uploadFirma.single("firma"),
  crearUsuario
);

// ✅ Actualizar (incluye cuotaMb en el MISMO endpoint)
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarUsuario"),
  uploadFirma.single("firma"),
  actualizarUsuario
);

// Eliminar
router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarUsuario"),
  eliminarUsuario
);

export default router;
