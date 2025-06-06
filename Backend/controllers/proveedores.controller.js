// controllers/proveedores.controller.js
import db from "../config/database.js";

// Verificar si un proveedor ya existe
export const verificarProveedorExistente = async (req, res) => {
  const { nombre, email, telefono } = req.query;

  if (!nombre?.trim() && !email?.trim() && !telefono?.trim()) {
    return res.status(400).json({
      error:
        "Debes proporcionar al menos nombre, email o teléfono para verificar duplicados",
    });
  }

  try {
    const conditions = [];
    const params = [];

    if (nombre?.trim()) {
      conditions.push("nombre = ?");
      params.push(nombre.trim());
    }
    if (email?.trim()) {
      conditions.push("email = ?");
      params.push(email.trim());
    }
    if (telefono?.trim()) {
      conditions.push("telefono = ?");
      params.push(telefono.trim());
    }

    const query = `SELECT nombre, email, telefono FROM proveedores WHERE ${conditions.join(
      " OR "
    )}`;
    const [rows] = await db.query(query, params);

    res.json({
      exists: rows.length > 0,
      duplicateFields: {
        nombre: rows.some((r) => r.nombre === nombre),
        email: rows.some((r) => r.email === email),
        telefono: rows.some((r) => r.telefono === telefono),
      },
    });
  } catch (error) {
    console.error("Error al verificar proveedor:", error);
    res.status(500).json({ message: "Error al verificar proveedor" });
  }
};

// Crear proveedor
export const crearProveedor = async (req, res) => {
  const { nombre, email, telefono, direccion, rif, estado } = req.body;

  if (!rif || !/^J-\d{9}$/.test(rif)) {
    return res
      .status(400)
      .json({ error: "Formato de RIF inválido. Use J-123456789" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      "INSERT INTO proveedores (nombre, email, telefono, direccion, rif, estado) VALUES (?, ?, ?, ?, ?, ?)",
      [
        nombre.trim(),
        email.trim(),
        telefono.trim(),
        direccion.trim(),
        rif.trim(),
        estado,
      ]
    );

    await conn.commit();

    // ✅ Consultar el proveedor recién creado y devolverlo completo
    const [proveedorCreado] = await conn.query(
      "SELECT * FROM proveedores WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(proveedorCreado[0]);
  } catch (error) {
    await conn.rollback();
    console.error("Error:", error);
    res
      .status(500)
      .json({ message: "Error al crear proveedor", error: error.message });
  } finally {
    conn.release();
  }
};

export const obtenerProveedores = async (req, res) => {
  // 1) Parseo seguro de page y limit
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 10
    : Number(req.query.limit);
  const offset = (page - 1) * limit;

  console.log("Valores de paginación (proveedores):", { limit, offset });

  try {
    // 2) Total de registros sin paginar
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM proveedores"
    );

    // 3) Registros paginados, inyectando limit y offset directamente
    const [proveedores] = await db.query(
      `SELECT *
         FROM proveedores
         ORDER BY id DESC
         LIMIT ${limit} OFFSET ${offset}`
    );

    // 4) Respuesta en el mismo formato que clientes
    return res.json({ proveedores, total });
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener los proveedores" });
  }
};

// Actualizar proveedor
export const actualizarProveedor = async (req, res) => {
  const { nombre, email, telefono, direccion, rif, estado } = req.body;
  const id = req.params.id;

  try {
    const [existing] = await db.query(
      "SELECT id FROM proveedores WHERE (nombre = ? OR email = ? OR telefono = ? OR rif = ?) AND id != ?",
      [nombre, email, telefono, rif, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Otro proveedor ya usa este nombre, email, teléfono o rif",
      });
    }

    const [result] = await db.query(
      "UPDATE proveedores SET nombre = ?, email = ?, telefono = ?, direccion = ?, rif = ?, estado = ? WHERE id = ?",
      [nombre, email, telefono, direccion, rif, estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json({ message: "Proveedor actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    res.status(500).json({ message: "Error al actualizar proveedor" });
  }
};

// Eliminar proveedor
export const eliminarProveedor = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM proveedores WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    res.status(500).json({ message: "Error al eliminar proveedor" });
  }
};

export const buscarProveedores = async (req, res) => {
  const q = (req.query.q || "").trim();
  const [rows] = await db.query(
    `
      SELECT id, rif, nombre 
      FROM proveedores 
      WHERE estado = 'activo'
        AND (rif LIKE ? OR nombre LIKE ?)
      ORDER BY nombre LIMIT 20`,
    [`%${q}%`, `%${q}%`]
  );
  res.json(rows);
};
