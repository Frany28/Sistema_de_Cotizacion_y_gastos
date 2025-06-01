import express from "express";
import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import { validarUsuario } from "../Middleware/validarUsuario.js";
import { uploadUsuario } from "../middlewares/uploadUsuario.js";
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from "../controllers/usuarios.controller.js";

const router = express.Router();

// 1) Listar todos los usuarios
router.get("/", autenticarUsuario, obtenerUsuarios);

// 2) Verificar permisos (debe ir antes de la ruta “/:id” para no colisionar)
router.get("/permisos/:clave", autenticarUsuario, async (req, res) => {
  const { clave } = req.params;
  const usuario = req.user;

  try {
    if (usuario.rol_id === 1) {
      return res.json({ tienePermiso: true });
    }

    const [rows] = await req.db.query(
      `SELECT 1
           FROM roles_permisos rp
           JOIN permisos p ON p.id = rp.permiso_id
           WHERE rp.rol_id = ? AND p.nombre = ?
           LIMIT 1`,
      [usuario.rol_id, clave]
    );

    res.json({ tienePermiso: rows.length > 0 });
  } catch (error) {
    console.error("Error al verificar permiso:", error);
    res.status(500).json({ message: "Error interno al verificar permiso" });
  }
});

// 3) Obtener un usuario por ID
router.get("/:id", autenticarUsuario, obtenerUsuarioPorId);

// 4) Crear un nuevo usuario (con firma opcional)
router.post(
  "/",
  autenticarUsuario,
  uploadUsuario.single("firma"),
  validarUsuario,
  crearUsuario
);

// 5) Actualizar un usuario existente (puede incluir nueva firma)
router.put(
  "/:id",
  autenticarUsuario,
  uploadUsuario.single("firma"),
  validarUsuario,
  actualizarUsuario
);

// 6) Eliminar un usuario
router.delete("/:id", autenticarUsuario, eliminarUsuario);

export default router;
