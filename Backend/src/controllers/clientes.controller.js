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

  // Validación básica
  if (
    ![nombre, email, telefono, direccion, identificacion].every((v) =>
      v?.trim()
    )
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
    // 2.1  Verificar duplicados rápidos por email o identificación
    const [existing] = await db.execute(
      "SELECT id FROM clientes WHERE email = ? OR identificacion = ?",
      [email.trim(), identificacion.trim()]
    );
    if (existing.length) {
      return res.status(409).json({
        error: "Cliente ya registrado",
      });
    }

    // 2.2  Insertar registro
    const sucursalId = sucursal_id ? parseInt(sucursal_id) : 4; // 4 = sucursal genérica

    const usuarioId = req.user.id;
    const [insert] = await db.execute(
      `INSERT INTO clientes 
      (nombre, email, telefono, direccion, sucursal_id, identificacion, creadoPor)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        email.trim(),
        telefono.trim(),
        direccion.trim(),
        sucursalId,
        identificacion.trim(),
        usuarioId,
      ]
    );

    const clienteId = insert.insertId;

    // 2.3  Generar código de referencia
    const codigoReferencia = `CLI-${String(clienteId).padStart(4, "0")}`;
    await db.execute("UPDATE clientes SET codigo_referencia = ? WHERE id = ?", [
      codigoReferencia,
      clienteId,
    ]);

    // 2.4  Limpiar listados en caché
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("clientes_")) cacheMemoria.del(k);
    }

    // 2.5  Traer el registro completo con el nombre de la sucursal
    const [[clienteCompleto]] = await db.execute(
      `SELECT c.id, c.codigo_referencia, c.nombre, c.email, c.telefono,
              c.direccion, c.identificacion, c.sucursal_id,
              s.nombre AS sucursal_nombre
       FROM clientes c
       LEFT JOIN sucursales s ON s.id = c.sucursal_id
       WHERE c.id = ?`,
      [clienteId]
    );

    // 2.6  Respuesta coherente con el resto de la API
    return res.status(201).json(clienteCompleto);
  } catch (error) {
    console.error("Error en crearCliente:", error);
    return res.status(500).json({ message: "Error al crear el cliente" });
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
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "ID de cliente inválido" });
  }

  const {
    nombre = "",
    email = "",
    telefono = "",
    direccion = "",
    identificacion = "",
    sucursal_id = null,
  } = req.body;

  if (
    ![nombre, email, telefono, direccion, identificacion].every((v) => v.trim())
  )
    return res.status(400).json({ error: "Todos los campos son obligatorios" });

  try {
    /* 1. Registro actual */
    const [[actual]] = await db.execute(
      "SELECT email, identificacion FROM clientes WHERE id = ?",
      [id]
    );
    if (!actual)
      return res.status(404).json({ message: "Cliente no encontrado" });

    /* 2. Detectar cambios */
    const emailCambio =
      actual.email?.toLowerCase().trim() !== email.toLowerCase().trim();
    const identCambio =
      (actual.identificacion ?? "").trim() !== identificacion.trim();

    /* 3. Verificar duplicados solo si cambiaron */
    if (emailCambio || identCambio) {
      const conds = [];
      const params = [];

      if (emailCambio) {
        conds.push("email = ?");
        params.push(email.trim());
      }
      if (identCambio) {
        conds.push("identificacion = ?");
        params.push(identificacion.trim());
      }

      const [dup] = await db.execute(
        `SELECT id FROM clientes WHERE (${conds.join(" OR ")}) AND id <> ?`,
        [...params, id]
      );
      if (dup.length) {
        return res.status(409).json({ error: "Conflicto de datos únicos" });
      }
    }

    /* 4. UPDATE */
    const usuarioId = req.user.id;
    const [result] = await db.execute(
      `UPDATE clientes
      SET nombre           = ?,
          email            = ?,
          telefono         = ?,
          direccion        = ?,
          identificacion   = ?,
          sucursal_id      = ?,
          actualizadoPor   = ?
    WHERE id = ?`,
      [
        nombre.trim(),
        email.trim(),
        telefono.trim(),
        direccion.trim(),
        identificacion.trim(),
        sucursal_id ? Number(sucursal_id) : null,
        usuarioId,
        id,
      ]
    );

    return res.json({
      message: result.affectedRows
        ? "Cliente actualizado correctamente"
        : "Sin cambios aplicados",
    });
  } catch (err) {
    console.error("Error al actualizar cliente:", err);
    return res
      .status(500)
      .json({ message: "Error interno al actualizar cliente" });
  }
};

// Eliminar cliente
export const eliminarCliente = async (req, res) => {
  const clienteId = Number(req.params.id);

  try {
    // Validar cuentas por cobrar pendientes
    const [[{ cuentaPendiente }]] = await db.execute(
      `SELECT COUNT(*) AS cuentaPendiente
         FROM cuentas_por_cobrar
        WHERE cliente_id = ? AND estado = 'pendiente'`,
      [clienteId]
    );

    if (cuentaPendiente > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar: el cliente tiene cuentas por cobrar pendientes.",
      });
    }

    // Validar cotizaciones en proceso
    const [[{ cotizacionPendiente }]] = await db.execute(
      `SELECT COUNT(*) AS cotizacionPendiente
         FROM cotizaciones
        WHERE cliente_id = ? AND estado = 'pendiente'`,
      [clienteId]
    );

    if (cotizacionPendiente > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar: el cliente tiene cotizaciones en proceso.",
      });
    }

    // Si pasa validaciones, borramos
    const [result] = await db.execute("DELETE FROM clientes WHERE id = ?", [
      clienteId,
    ]);

    // Limpiar caché
    cacheMemoria.del(`cliente_${clienteId}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("clientes_")) cacheMemoria.del(k);
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    // Respuesta 204 para forzar refresco en frontend
    return res.status(204).end();
  } catch (error) {
    if (error.errno === 1451) {
      return res.status(409).json({
        error: "No se puede eliminar: el cliente tiene registros asociados.",
      });
    }
    console.error("Error al eliminar cliente:", error);
    return res
      .status(500)
      .json({ message: "Error interno al eliminar el cliente." });
  }
};
