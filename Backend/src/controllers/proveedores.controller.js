// controllers/proveedores.controller.js
import db from "../config/database.js";
import cacheMemoria from "../utils/cacheMemoria.js";

// Verificar si un proveedor ya existe
export const verificarProveedorExistente = async (req, res) => {
  const { nombre, email, telefono } = req.query;
  const keyCheck = `verifProv_${nombre ?? ""}_${email ?? ""}_${telefono ?? ""}`;
  const hit = cacheMemoria.get(keyCheck);
  if (hit) return res.json(hit);

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
    cacheMemoria.set(
      keyCheck,
      {
        exists: rows.length > 0,
        duplicateFields: {
          nombre: rows.some((r) => r.nombre === nombre),
          email: rows.some((r) => r.email === email),
          telefono: rows.some((r) => r.telefono === telefono),
        },
      },
      60
    );

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

    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("proveedores_")) cacheMemoria.del(k);
    }

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
  /* ----------- parámetros seguros ----------- */
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const terminoRaw = (req.query.buscar || "").trim();
  const usaFiltro = terminoRaw.length > 0;
  const termino = `${terminoRaw}%`; // comodín ambos lados
  const offset = (page - 1) * limit;

  const claveCache = `proveedores_${page}_${limit}_${terminoRaw}`;
  const enCache = cacheMemoria.get(claveCache);
  if (enCache) return res.json(enCache);

  try {
    /* ----------- total con posible filtro ----------- */
    let total;
    if (usaFiltro) {
      [[{ total }]] = await db.query(
        "SELECT COUNT(*) AS total FROM proveedores WHERE nombre LIKE ?",
        [termino]
      );
    } else {
      [[{ total }]] = await db.query(
        "SELECT COUNT(*) AS total FROM proveedores"
      );
    }

    /* ----------- listado paginado ----------- */
    let proveedores;
    if (usaFiltro) {
      [proveedores] = await db.query(
        `SELECT id, nombre, email, telefono, direccion, rif, estado
       FROM proveedores
      WHERE nombre LIKE ?
      ORDER BY nombre ASC
      LIMIT ? OFFSET ?`,
        [`${terminoRaw}%`, limit, offset]
      );
    } else {
      [proveedores] = await db.query(
        `SELECT id, nombre, email, telefono, direccion, rif, estado
       FROM proveedores
      ORDER BY nombre ASC
      LIMIT ? OFFSET ?`,
        [limit, offset]
      );
    }
    cacheMemoria.set(claveCache, { proveedores, total }, 300);
    return res.json({ proveedores, total });
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return res
      .status(500)
      .json({ message: "Error interno al obtener los proveedores" });
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

    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("proveedores_")) cacheMemoria.del(k);
    }

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
// proveedores.controller.js
export const eliminarProveedor = async (req, res) => {
  const { id } = req.params;

  try {
    /* 1️⃣  Comprobar existencia y estado */
    const [[proveedor]] = await db.query(
      "SELECT estado FROM proveedores WHERE id = ?",
      [id]
    );

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    if (proveedor.estado === "activo") {
      return res.status(409).json({
        error: "No permitido",
        message:
          "El proveedor está ACTIVO; primero cámbielo a INACTIVO para poder eliminarlo.",
      });
    }

    /* 2️⃣  Intentar eliminar; capturar FK para responder 409 */
    let resultado;
    try {
      [resultado] = await db.query("DELETE FROM proveedores WHERE id = ?", [
        id,
      ]);
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          error: "Proveedor con gastos",
          message:
            "No puedes eliminar un proveedor que tiene gastos registrados.",
        });
      }
      throw err; // otros errores los maneja el catch exterior
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    /* 3️⃣  Limpiar caché de listados */
    for (const clave of cacheMemoria.keys()) {
      if (clave.startsWith("proveedores_")) cacheMemoria.del(clave);
    }

    return res.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminarProveedor:", error);
    return res.status(500).json({ message: "Error al eliminar proveedor" });
  }
};

export const buscarProveedores = async (req, res) => {
  const q = (req.query.q || "").trim();
  const key = `buscProv_${q}`;
  const hit = cacheMemoria.get(key);
  if (hit) return res.json(hit);
  const [rows] = await db.query(
    `
      SELECT id, rif, nombre 
      FROM proveedores 
      WHERE estado = 'activo'
        AND (rif LIKE ? OR nombre LIKE ?)
      ORDER BY nombre LIMIT 20`,
    [`%${q}%`, `%${q}%`]
  );
  cacheMemoria.set(key, rows, 120);
  res.json(rows);
};
