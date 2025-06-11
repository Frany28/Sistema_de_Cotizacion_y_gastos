// controllers/sucursales.controller.js
import db from "../config/database.js";

export const obtenerSucursales = async (req, res) => {
  // 1) Parseo seguro de page y limit
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 10
    : Number(req.query.limit);
  const offset = (page - 1) * limit;

  console.log("Valores de paginación (sucursales):", { limit, offset });

  try {
    // 2) Total de registros sin paginar
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM sucursales"
    );

    // 3) Datos paginados: inyectamos limit y offset como literales
    const [sucursales] = await db.query(
      `SELECT *
       FROM sucursales
       ORDER BY id DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 4) Respondemos con el mismo formato que en clientes
    return res.json({ sucursales, total });
  } catch (error) {
    console.error("Error al obtener sucursales:", error);
    return res.status(500).json({ message: "Error al obtener las sucursales" });
  }
};

// Obtener una sucursal por ID
export const obtenerSucursal = async (req, res) => {
  try {
    const [sucursal] = await db.execute(
      "SELECT * FROM sucursales WHERE id = ?",
      [req.params.id]
    );

    if (sucursal.length === 0) {
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }

    res.json(sucursal[0]);
  } catch (error) {
    console.error("Error al obtener sucursal:", error);
    res.status(500).json({ message: "Error al obtener la sucursal" });
  }
};

// Crear una nueva sucursal
export const crearSucursal = async (req, res) => {
  const {
    codigo,
    nombre,
    direccion,
    ciudad,
    estado_provincia,
    pais,
    telefono,
    email,
    responsable,
  } = req.body;

  // Validación básica
  if (!codigo?.trim() || !nombre?.trim() || !direccion?.trim()) {
    return res.status(400).json({
      error: "Código, nombre y dirección son campos obligatorios",
      detalles: {
        codigo: !codigo?.trim() ? "Falta el código" : null,
        nombre: !nombre?.trim() ? "Falta el nombre" : null,
        direccion: !direccion?.trim() ? "Falta la dirección" : null,
      },
    });
  }

  try {
    // Verificar si el código ya existe
    const [existing] = await db.execute(
      "SELECT id FROM sucursales WHERE codigo = ?",
      [codigo.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "El código de sucursal ya está en uso",
      });
    }

    // Insertar en BD
    const [result] = await db.execute(
      "INSERT INTO sucursales (codigo, nombre, direccion, ciudad, estado_provincia, pais, telefono, email, responsable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        codigo.trim(),
        nombre.trim(),
        direccion.trim(),
        ciudad?.trim() || null,
        estado_provincia?.trim() || null,
        pais?.trim() || null,
        telefono?.trim() || null,
        email?.trim() || null,
        responsable?.trim() || null,
      ]
    );

    res.status(201).json({
      message: "Sucursal creada correctamente",
      id: result.insertId,
      codigo,
      nombre,
      direccion,
      ciudad,
      estado_provincia,
      pais,
      telefono,
      email,
      responsable,
    });
  } catch (error) {
    console.error("Error en crearSucursal:", {
      message: error.message,
      code: error.code,
      sql: error.sql,
      body: req.body,
    });

    res.status(500).json({
      message: "Error al crear la sucursal",
      error: error.message,
    });
  }
};

// Actualizar sucursal
export const actualizarSucursal = async (req, res) => {
  const {
    codigo,
    nombre,
    direccion,
    ciudad,
    estado_provincia,
    pais,
    telefono,
    email,
    responsable,
  } = req.body;

  const id = req.params.id;

  if (!codigo?.trim() || !nombre?.trim() || !direccion?.trim()) {
    return res.status(400).json({
      error: "Código, nombre y dirección son campos obligatorios",
    });
  }

  try {
    // Verificar si el código ya está en uso por otra sucursal
    const [existing] = await db.execute(
      "SELECT id FROM sucursales WHERE codigo = ? AND id != ?",
      [codigo.trim(), id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "El código de sucursal ya está en uso por otra sucursal",
      });
    }

    const [result] = await db.execute(
      "UPDATE sucursales SET codigo = ?, nombre = ?, direccion = ?, ciudad = ?, estado_provincia = ?, pais = ?, telefono = ?, email = ?, responsable = ? WHERE id = ?",
      [
        codigo.trim(),
        nombre.trim(),
        direccion.trim(),
        ciudad?.trim() || null,
        estado_provincia?.trim() || null,
        pais?.trim() || null,
        telefono?.trim() || null,
        email?.trim() || null,
        responsable?.trim() || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }

    res.json({
      id: Number(id),
      codigo,
      nombre,
      direccion,
      ciudad,
      estado_provincia,
      pais,
      telefono,
      email,
      responsable,
      message: "Sucursal actualizada correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar sucursal:", error);
    res.status(500).json({ message: "Error al actualizar la sucursal" });
  }
};

// Eliminar sucursal
export const eliminarSucursal = async (req, res) => {
  try {
    // Verificar si hay clientes asociados a esta sucursal
    const [clientesAsociados] = await db.execute(
      "SELECT COUNT(*) AS count FROM clientes WHERE sucursal_id = ?",
      [req.params.id]
    );

    if (clientesAsociados[0].count > 0) {
      return res.status(400).json({
        message:
          "No se puede eliminar la sucursal porque tiene clientes asociados",
      });
    }

    const [result] = await db.execute("DELETE FROM sucursales WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }

    res.json({ message: "Sucursal eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar sucursal:", error);
    res.status(500).json({ message: "Error al eliminar la sucursal" });
  }
};

// Obtener sucursales para dropdown (solo id y nombre)
export const obtenerSucursalesDropdown = async (req, res) => {
  try {
    const [sucursales] = await db.execute(
      "SELECT id, nombre FROM sucursales ORDER BY nombre"
    );

    res.json(sucursales);
  } catch (error) {
    console.error("Error al obtener sucursales para dropdown:", error);
    res.status(500).json({ message: "Error al obtener las sucursales" });
  }
};
