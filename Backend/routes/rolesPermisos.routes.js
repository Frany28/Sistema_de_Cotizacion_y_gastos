// routes/rolesPermisos.routes.js
import express from "express";
import db from "../config/database.js";

const router = express.Router();

// 🔹 Obtener los permisos de un rol específico
router.get("/:rol_id/permisos", async (req, res) => {
  const { rol_id } = req.params;

  try {
    const [permisos] = await db.query(
      `SELECT p.id, p.nombre, p.descripcion
       FROM permisos p
       INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = ?`,
      [rol_id]
    );

    res.json(permisos);
  } catch (error) {
    console.error("Error al obtener permisos del rol:", error);
    res.status(500).json({ message: "Error al obtener permisos" });
  }
});

// 🔹 Asignar un permiso a un rol
router.post("/", async (req, res) => {
  const { rol_id, permiso_id } = req.body;

  if (!rol_id || !permiso_id) {
    return res
      .status(400)
      .json({ message: "rol_id y permiso_id son requeridos" });
  }

  try {
    await db.query(
      "INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)",
      [rol_id, permiso_id]
    );
    res.status(201).json({ message: "Permiso asignado al rol correctamente" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Este permiso ya está asignado al rol" });
    }

    console.error("Error al asignar permiso:", error);
    res.status(500).json({ message: "Error al asignar permiso al rol" });
  }
});

// 🔹 Quitar un permiso de un rol
router.delete("/", async (req, res) => {
  const { rol_id, permiso_id } = req.body;

  if (!rol_id || !permiso_id) {
    return res
      .status(400)
      .json({ message: "rol_id y permiso_id son requeridos" });
  }

  try {
    await db.query(
      "DELETE FROM roles_permisos WHERE rol_id = ? AND permiso_id = ?",
      [rol_id, permiso_id]
    );
    res.json({ message: "Permiso eliminado del rol correctamente" });
  } catch (error) {
    console.error("Error al eliminar permiso del rol:", error);
    res.status(500).json({ message: "Error al eliminar permiso del rol" });
  }
});

export default router;
