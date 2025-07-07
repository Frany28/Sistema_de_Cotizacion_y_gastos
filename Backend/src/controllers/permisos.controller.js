// controllers/permisos.controller.js
import db from "../config/database.js";
import cacheMemoria from "../utils/cacheMemoria.js";

export const obtenerPermisos = async (req, res) => {
  try {
    const key = "permisos_todos";
    const hit = cacheMemoria.get(key);
    if (hit) return res.json(hit);
    const [rows] = await db.query("SELECT * FROM permisos");
    cacheMemoria.set(key, rows, 3600);
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
    cacheMemoria.del("permisos_todos");
    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (error) {
    console.error("Error al crear permiso:", error);
    res.status(500).json({ message: "Error al crear permiso" });
  }
};
