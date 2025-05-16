// controllers/permisos.controller.js
import db from "../config/database.js";

export const obtenerPermisos = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM permisos");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener permisos:", error);
    res.status(500).json({ message: "Error al obtener permisos" });
  }
};

export const crearPermiso = async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ message: "El nombre del permiso es obligatorio" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO permisos (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );

    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (error) {
    console.error("Error al crear permiso:", error);
    res.status(500).json({ message: "Error al crear permiso" });
  }
};
