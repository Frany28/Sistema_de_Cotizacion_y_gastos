// controllers/clientes.controller.js
import db from "../config/database.js";
import cacheMemoria from "../utils/cacheMemoria.js";

// Verificar si un cliente ya existe (por nombre o email)
export const verificarClienteExistente = async (req, res) => {
  const { nombre = "", email = "" } = req.query;

  const key = `verif_${nombre.trim()}_${email.trim()}`;
  const hit = cacheMemoria.get(key);
  if (hit) return res.json(hit);

  if (!nombre.trim() && !email.trim()) {
    return res.status(400).json({
      error: "Se requiere al menos un nombre o email para la verificación",
    });
  }

  try {
    const conditions = [];
    const params = [];

    if (nombre.trim()) {
      conditions.push("nombre = ?");
      params.push(nombre.trim());
    }
    if (email.trim()) {
      conditions.push("email  = ?");
      params.push(email.trim());
    }

    const [rows] = await db.execute(
      `SELECT nombre, email FROM clientes WHERE ${conditions.join(" OR ")}`,
      params
    );

    const response = {
      exists: rows.length > 0,
      duplicateFields: {
        nombre: rows.some((r) => r.nombre === nombre.trim()),
        email: rows.some((r) => r.email === email.trim()),
      },
    };
    cacheMemoria.set(key, response, 60); // TTL 1 min
    res.json(response);
  } catch (error) {
    console.error("Error al verificar cliente:", error);
    res.status(500).json({ message: "Error interno al verificar cliente" });
  }
};

// Crear un nuevo cliente
export const crearCliente = async (req, res) => {
  const { nombre, email, telefono, direccion, sucursal_id, identificacion } =
    req.body;

  // Validación mejorada
  if (
    !nombre?.trim() ||
    !email?.trim() ||
    !telefono?.trim() ||
    !direccion?.trim() ||
    !identificacion?.trim()
  ) {
    return res.status(400).json({
      error: "Todos los campos son obligatorios",
      detalles: {
        nombre: !nombre?.trim() ? "Falta el nombre" : null,
        email: !email?.trim() ? "Falta el email" : null,
        telefono: !telefono?.trim() ? "Falta el teléfono" : null,
        direccion: !direccion?.trim() ? "Falta la dirección" : null,
        identificacion: !identificacion?.trim()
          ? "Falta la identificación"
          : null,
      },
    });
  }

  try {
    // Verificar duplicados
    const [existing] = await db.execute(
      "SELECT id FROM clientes WHERE email = ? OR identificacion = ?",
      [email.trim(), identificacion.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Cliente ya registrado",
        duplicateFields: {
          email: existing.some((row) => row.email === email.trim()),
          identificacion: existing.some(
            (row) => row.identificacion === identificacion.trim()
          ),
        },
      });
    }

    // Asegurar que sucursal_id sea un número o usar valor por defecto (4)
    const sucursalId = sucursal_id ? parseInt(sucursal_id) : 4;

    // Insertar en BD con valores asegurados
    const [result] = await db.execute(
      "INSERT INTO clientes (nombre, email, telefono, direccion, sucursal_id, identificacion) VALUES (?, ?, ?, ?, ?, ?)",
      [
        nombre.trim(),
        email.trim(),
        telefono.trim(),
        direccion.trim(),
        sucursalId,
        identificacion.trim(),
      ]
    );

    // 🆕 invalidar listados
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("clientes_")) cacheMemoria.del(k);
    }

    // Generar código de referencia
    const codigoReferencia = `CLI-${String(result.insertId).padStart(4, "0")}`;
    await db.execute("UPDATE clientes SET codigo_referencia = ? WHERE id = ?", [
      codigoReferencia,
      result.insertId,
    ]);

    res.status(201).json({
      message: "Cliente creado correctamente",
      id: result.insertId,
      codigo_referencia: codigoReferencia,
      nombre,
      email,
      telefono,
      direccion,
      sucursal_id: sucursalId,
      identificacion,
    });
  } catch (error) {
    console.error("Error en crearCliente:", {
      message: error.message,
      code: error.code,
      sql: error.sql,
      body: req.body,
    });

    res.status(500).json({
      message: "Error al crear el cliente",
      error: error.message,
      code: error.code,
    });
  }
};
// Obtener clientes paginados
export const obtenerClientes = async (req, res) => {
  // Convertir explícitamente a número
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 10
    : Number(req.query.limit);
  const offset = (page - 1) * limit;

  const claveCache = `clientes_${page}_${limit}`;
  const enCache = cacheMemoria.get(claveCache);
  if (enCache) return res.json(enCache);

  try {
    // 1. Total de registros
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM clientes"
    );

    const [clientes] = await db.query(
      `SELECT * FROM clientes ORDER BY id DESC LIMIT ${Number(
        limit
      )} OFFSET ${Number(offset)}`
    );

    cacheMemoria.set(claveCache, { clientes, total }, 300); // TTL 5 min

    res.json({ clientes, total });
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({ message: "Error al obtener los clientes" });
  }
};

// Actualizar cliente
export const actualizarCliente = async (req, res) => {
  const { nombre, email, telefono, direccion, identificacion, sucursal_id } =
    req.body;
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "ID de cliente inválido" });
  }

  /* Validación básica */
  if (
    ![nombre, email, telefono, direccion, identificacion].every((v) =>
      v?.trim?.()
    )
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    /* 🆕 Solo verifico duplicados en email o identificación */
    const [duplicados] = await db.execute(
      `SELECT id, email, identificacion
         FROM clientes
        WHERE (email = ? OR identificacion = ?)
          AND id <> ?`,
      [email.trim(), identificacion.trim(), id]
    );

    if (duplicados.length) {
      return res.status(409).json({
        error: "Conflicto de datos únicos",
        duplicateFields: {
          email: duplicados.some((r) => r.email === email.trim()),
          identificacion: duplicados.some(
            (r) => r.identificacion === identificacion.trim()
          ),
        },
      });
    }

    /* UPDATE */
    const [result] = await db.execute(
      `UPDATE clientes
          SET nombre         = ?,
              email          = ?,
              telefono       = ?,
              direccion      = ?,
              identificacion = ?,
              sucursal_id    = ?
        WHERE id = ?`,
      [
        nombre.trim(),
        email.trim(),
        telefono.trim(),
        direccion.trim(),
        identificacion.trim(),
        sucursal_id ? Number(sucursal_id) : 4,
        id,
      ]
    );

    /* 🆕 si no cambió nada devolvemos 200 igual */
    if (!result.affectedRows) {
      return res.status(200).json({ message: "Sin cambios aplicados" });
    }

    /* invalidar caché */
    cacheMemoria.del(`cliente_${id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("clientes_")) cacheMemoria.del(k);
    }

    res.json({
      id: Number(id),
      nombre,
      email,
      telefono,
      direccion,
      identificacion,
      sucursal_id,
      message: "Cliente actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ message: "Error al actualizar el cliente" });
  }
};

// Eliminar cliente
export const eliminarCliente = async (req, res) => {
  try {
    const [result] = await db.execute("DELETE FROM clientes WHERE id = ?", [
      req.params.id,
    ]);

    /* limpiar caché */
    cacheMemoria.del(`cliente_${req.params.id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("clientes_")) cacheMemoria.del(k);
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    /* 🆕 204 = éxito sin payload, fuerza al front a refrescar lista */
    res.status(204).end();
  } catch (error) {
    /* Si existe FK a cotizaciones/abonos, MySQL lanzará 1451 */
    if (error.errno === 1451) {
      return res.status(409).json({
        error: "No se puede eliminar: el cliente tiene registros asociados",
      });
    }
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ message: "Error al eliminar el cliente" });
  }
};
