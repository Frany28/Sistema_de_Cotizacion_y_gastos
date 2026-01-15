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
  actualizarCuotaUsuario,
} from "../controllers/usuarios.controller.js";

const router = express.Router();

// Listado y detalle
router.get("/", autenticarUsuario, obtenerUsuarios);
router.get("/permisos/:permiso", autenticarUsuario);
router.get("/:id", autenticarUsuario, obtenerUsuarioPorId);

router.post("/", autenticarUsuario, uploadFirma.single("firma"), crearUsuario);

router.put(
  "/:id",
  autenticarUsuario,
  uploadFirma.single("firma"),
  actualizarUsuario
);

// Eliminar
router.delete("/:id", autenticarUsuario, eliminarUsuario);

router.patch(
  "/:id/cuota",
  validarPermisoUsuarios("editarCuotaUsuario"),
  actualizarCuotaUsuario
);

// Verificar permiso por clave (esta sí tiene handler)
router.get("/permisos/:clave", autenticarUsuario, async (req, res) => {
  const { clave } = req.params;
  const usuario = req.user;

  try {
    if (usuario.rol_id === 1) {
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
