// routes/roles.routes.js
import express from "express";
import db from "../config/database.js";

const router = express.Router();

// Obtener todos los roles
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM roles");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener roles:", error);
    res.status(500).json({ message: "Error al obtener roles" });
  }
});

// Crear nuevo rol
router.post("/", async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ message: "El nombre del rol es obligatorio" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO roles (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );

    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (error) {
    console.error("Error al crear rol:", error);
    res.status(500).json({ message: "Error al crear rol" });
  }
});

export default router;
