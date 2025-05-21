// controllers/servicios_productos.controller.js
import db from "../config/database.js";

// Verificar si un servicio/producto ya existe
export const verificarServicioProductoExistente = async (req, res) => {
  const { nombre } = req.query;

  if (!nombre?.trim()) {
    return res
      .status(400)
      .json({ message: "Se requiere un nombre para verificar duplicados" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT nombre FROM servicios_productos WHERE nombre = ?",
      [nombre.trim()]
    );

    res.json({
      exists: rows.length > 0,
      duplicateFields: {
        nombre: rows.length > 0,
      },
    });
  } catch (error) {
    console.error("Error al verificar servicio/producto:", error);
    res.status(500).json({ message: "Error al verificar servicio/producto" });
  }
};

// Crear servicio/producto
export const crearServicioProducto = async (req, res) => {
  const {
    nombre,
    descripcion,
    precio,
    tipo,
    porcentaje_iva = 16.0,
    cantidad_actual = 0,
    cantidad_anterior = 0,
  } = req.body;

  try {
    const [existing] = await db.execute(
      "SELECT id FROM servicios_productos WHERE nombre = ?",
      [nombre]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Ya existe un servicio/producto con ese nombre",
        duplicateFields: { nombre: true },
      });
    }

    console.log("Datos recibidos en backend:", req.body);
    const insertQuery =
      tipo === "producto"
        ? `INSERT INTO servicios_productos (nombre, descripcion, precio, tipo, porcentaje_iva, cantidad_actual, cantidad_anterior) VALUES (?, ?, ?, ?, ?, ?, ?)`
        : `INSERT INTO servicios_productos (nombre, descripcion, precio, tipo, porcentaje_iva) VALUES (?, ?, ?, ?, ?)`;

    const insertParams =
      tipo === "producto"
        ? [
            nombre,
            descripcion,
            precio,
            tipo,
            porcentaje_iva,
            cantidad_actual,
            cantidad_anterior,
          ]
        : [nombre, descripcion, precio, tipo, porcentaje_iva];

    const [insertResult] = await db.execute(insertQuery, insertParams);

    const insertId = insertResult.insertId;

    if (!insertId) {
      return res
        .status(500)
        .json({ error: "No se pudo obtener el ID insertado" });
    }

    // Generar código
    const codigoGenerado = `${tipo === "producto" ? "PRO" : "SER"}-${String(
      insertId
    ).padStart(4, "0")}`;

    await db.execute("UPDATE servicios_productos SET codigo = ? WHERE id = ?", [
      codigoGenerado,
      insertId,
    ]);

    const [nuevo] = await db.execute(
      "SELECT * FROM servicios_productos WHERE id = ?",
      [insertId]
    );

    res.status(201).json(nuevo[0]);
  } catch (error) {
    console.error(" Error al crear servicio/producto:", error);
    res
      .status(500)
      .json({ error: "Error interno al registrar el producto o servicio" });
  }
};

export const getServicioProductoById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, precio, cantidad_actual AS stock, tipo, IFNULL(porcentaje_iva, 0.00) AS porcentaje_iva FROM servicios_productos WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ message: "Error al obtener producto" });
  }
};

// Obtener servicios/productos con filtro opcional
export const obtenerServiciosProductos = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = "SELECT * FROM servicios_productos";
    const params = [];

    if (tipo) {
      query += " WHERE tipo = ?";
      params.push(tipo);
    }

    // Ordenar por ID descendente (más recientes primero)
    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [rows] = await db.execute(query, params);

    // Consulta total de resultados
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM servicios_productos ${
        tipo ? "WHERE tipo = ?" : ""
      }`,
      tipo ? [tipo] : []
    );

    res.json({
      servicios: rows,
      total: countRows[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error al obtener servicios/productos:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los servicios/productos" });
  }
};

// Actualizar servicio/producto
export const actualizarServicioProducto = async (req, res) => {
  const { nombre, descripcion, precio, tipo, estado, porcentaje_iva } =
    req.body;
  const id = req.params.id;

  try {
    const [existing] = await db.execute(
      "SELECT id FROM servicios_productos WHERE nombre = ? AND id != ?",
      [nombre, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Otro servicio/producto ya usa ese nombre",
        duplicateFields: { nombre: true },
      });
    }

    const [result] = await db.execute(
      `UPDATE servicios_productos 
       SET nombre = ?, descripcion = ?, precio = ?, tipo = ?, estado = ?, porcentaje_iva = ?
       WHERE id = ?`,
      [nombre, descripcion, precio, tipo, estado, porcentaje_iva, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Servicio/Producto no encontrado" });
    }

    res.json({ message: "Servicio/Producto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar servicio/producto:", error);
    res.status(500).json({ message: "Error al actualizar servicio/producto" });
  }
};

export const restarCantidadProducto = async (req, res) => {
  const { producto_id, cantidad_vendida } = req.body;

  if (
    !producto_id ||
    typeof cantidad_vendida !== "number" ||
    cantidad_vendida <= 0
  ) {
    return res.status(400).json({
      message: "Se requiere producto_id y cantidad_vendida válida",
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT cantidad_actual FROM servicios_productos WHERE id = ? AND tipo = 'producto'",
      [producto_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const actual = rows[0].cantidad_actual;

    if (cantidad_vendida > actual) {
      return res.status(400).json({
        message: "No hay suficiente inventario para realizar la venta",
      });
    }

    await db.execute(
      `UPDATE servicios_productos 
       SET cantidad_anterior = cantidad_actual,
           cantidad_actual = cantidad_actual - ?
       WHERE id = ?`,
      [cantidad_vendida, producto_id]
    );

    res.json({ message: "Cantidad actualizada exitosamente" });
  } catch (error) {
    console.error("Error al restar cantidad:", error);
    res.status(500).json({ message: "Error al actualizar inventario" });
  }
};

// Eliminar servicio/producto
export const eliminarServicioProducto = async (req, res) => {
  try {
    const [result] = await db.execute(
      "DELETE FROM servicios_productos WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Servicio/Producto no encontrado" });
    }

    res.json({ message: "Servicio/Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar servicio/producto:", error);
    res.status(500).json({ message: "Error al eliminar servicio/producto" });
  }
};
