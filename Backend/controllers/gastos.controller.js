// controllers/gastos.controller.js
import db from "../config/database.js";

export const getGastos = async (req, res) => {
  // 1) Parseo seguro de page y limit (por defecto page=1, limit=5)
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 5
    : Number(req.query.limit);
  const offset = (page - 1) * limit;

  // 2) Validación básica de parámetros
  if (page < 1 || limit < 1) {
    return res
      .status(400)
      .json({ message: "Parámetros de paginación inválidos" });
  }

  try {
    // 3) Total de registros (sin paginación)
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM gastos"
    );

    // 4) Datos paginados, inyectando limit y offset como literales
    const [gastos] = await db.query(`
      SELECT 
        g.id, g.codigo, g.proveedor_id, p.nombre AS proveedor,
        g.concepto_pago, g.subtotal, g.porcentaje_iva, g.impuesto,
        g.total, g.descripcion, g.fecha, g.estado, g.motivo_rechazo,
        g.tipo_gasto_id, g.sucursal_id, s.nombre AS sucursal,
        g.cotizacion_id, g.moneda, g.tasa_cambio, g.usuario_id,
        CASE WHEN g.moneda = 'VES' THEN (g.subtotal * g.tasa_cambio) ELSE g.subtotal END AS subtotal_bs,
        CASE WHEN g.moneda = 'VES' THEN (g.impuesto * g.tasa_cambio) ELSE g.impuesto END AS impuesto_bs,
        CASE WHEN g.moneda = 'VES' THEN (g.total * g.tasa_cambio) ELSE g.total END AS total_bs
      FROM gastos g
      LEFT JOIN proveedores p ON p.id = g.proveedor_id
      LEFT JOIN sucursales s ON s.id = g.sucursal_id
      ORDER BY g.fecha DESC, g.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 5) Respuesta con paginación coherente
    return res.json({
      data: gastos,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error interno al obtener gastos:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateGasto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el gasto existe
    const [[gastoExistente]] = await db.query(
      `SELECT * FROM gastos WHERE id = ?`,
      [id]
    );

    if (!gastoExistente) {
      return res.status(404).json({ message: "Gasto no encontrado" });
    }

    // Verificar si el gasto está aprobado (no se puede editar)
    if (gastoExistente.estado === "aprobado") {
      return res
        .status(403)
        .json({ message: "No puedes editar un gasto aprobado." });
    }

    const {
      proveedor_id,
      concepto_pago,
      tipo_gasto_id,
      descripcion,
      subtotal,
      porcentaje_iva,
      fecha,
      sucursal_id,
      cotizacion_id,
      moneda,
      tasa_cambio,
      estado,
      motivo_rechazo,
    } = req.body;

    // Validar y calcular valores
    const subtotalNum = parseFloat(subtotal);
    if (isNaN(subtotalNum) || subtotalNum <= 0) {
      return res.status(400).json({ message: "Subtotal inválido." });
    }

    const ivaNum = parseFloat(porcentaje_iva);
    if (isNaN(ivaNum) || ivaNum < 0) {
      return res.status(400).json({ message: "Porcentaje de IVA inválido." });
    }

    const impuesto = parseFloat(((subtotalNum * ivaNum) / 100).toFixed(2));
    const total = parseFloat((subtotalNum + impuesto).toFixed(2));

    // Validar estado
    const estadosPermitidos = ["pendiente", "rechazado"];
    const nuevoEstado =
      estado && estadosPermitidos.includes(estado)
        ? estado
        : gastoExistente.estado;

    // Verificar si el estado es rechazado y se requiere motivo
    let motivoRechazoFinal = motivo_rechazo;
    if (
      nuevoEstado === "rechazado" &&
      (!motivo_rechazo || motivo_rechazo.trim() === "")
    ) {
      return res
        .status(400)
        .json({ message: "Debes indicar el motivo del rechazo." });
    } else if (nuevoEstado !== "rechazado") {
      motivoRechazoFinal = null; // Limpiar motivo de rechazo si el estado no es rechazado
    }

    // Validar tasa de cambio solo si es VES
    let tasaCambioFinal = tasa_cambio;
    if (moneda === "VES" && (!tasa_cambio || isNaN(parseFloat(tasa_cambio)))) {
      return res
        .status(400)
        .json({ message: "Tasa de cambio inválida para VES." });
    } else if (moneda !== "VES") {
      tasaCambioFinal = null;
    }

    // Actualizar el gasto
    await db.query(
      `UPDATE gastos SET 
        proveedor_id = ?, 
        concepto_pago = ?, 
        tipo_gasto_id = ?, 
        descripcion = ?, 
        subtotal = ?, 
        porcentaje_iva = ?, 
        impuesto = ?, 
        total = ?, 
        fecha = ?, 
        sucursal_id = ?, 
        cotizacion_id = ?, 
        moneda = ?, 
        tasa_cambio = ?, 
        estado = ?, 
        motivo_rechazo = ?, 
        updated_at = NOW()
      WHERE id = ?`,
      [
        proveedor_id,
        concepto_pago,
        tipo_gasto_id,
        descripcion,
        subtotalNum,
        ivaNum,
        impuesto,
        total,
        fecha,
        sucursal_id,
        cotizacion_id,
        moneda,
        tasaCambioFinal,
        nuevoEstado,
        motivoRechazoFinal,
        id,
      ]
    );

    // Obtener el gasto actualizado
    const [[gastoActualizado]] = await db.query(
      "SELECT * FROM gastos WHERE id = ?",
      [id]
    );

    res.json({ message: "Gasto actualizado", data: gastoActualizado });
  } catch (error) {
    console.error("Error al actualizar gasto:", error);
    res.status(500).json({ message: "Error interno al actualizar gasto" });
  }
};

export const deleteGasto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el gasto está aprobado
    const [[gastoExistente]] = await db.query(
      "SELECT estado FROM gastos WHERE id = ?",
      [id]
    );

    if (!gastoExistente) {
      return res.status(404).json({ message: "Gasto no encontrado" });
    }

    if (gastoExistente.estado === "aprobado") {
      return res.status(403).json({
        message: "No puedes eliminar un gasto que ya está aprobado.",
      });
    }

    await db.query("DELETE FROM gastos WHERE id = ?", [id]);
    res.json({ message: "Gasto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    res.status(500).json({ message: "Error interno al eliminar gasto" });
  }
};

// controllers/gastos.controller.js

export const getGastoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Consultar el gasto y sus relaciones (Proveedor, Sucursal, Cotización)
    const [[gasto]] = await db.query(
      `
      SELECT 
        g.*, 
        p.nombre AS proveedor_nombre, 
        p.id AS proveedor_id,
        s.nombre AS sucursal_nombre, 
        s.id AS sucursal_id,
        c.codigo_referencia AS cotizacion_codigo, 
        c.id AS cotizacion_id,
        tg.nombre AS tipo_gasto_nombre,
        tg.id AS tipo_gasto_id
      FROM gastos g
      LEFT JOIN proveedores p ON p.id = g.proveedor_id
      LEFT JOIN sucursales s ON s.id = g.sucursal_id
      LEFT JOIN cotizaciones c ON c.id = g.cotizacion_id
      LEFT JOIN tipos_gasto tg ON tg.id = g.tipo_gasto_id
      WHERE g.id = ?;
    `,
      [id]
    );

    if (!gasto) {
      return res.status(404).json({ message: "Gasto no encontrado" });
    }

    // Obtener listas de opciones para el formulario de edición
    const [tiposGasto] = await db.query("SELECT id, nombre FROM tipos_gasto");
    const [proveedores] = await db.query(
      "SELECT id, nombre FROM proveedores WHERE estado = 'activo'"
    );
    const [sucursales] = await db.query("SELECT id, nombre FROM sucursales");
    const [cotizaciones] = await db.query(
      "SELECT id, codigo_referencia FROM cotizaciones"
    );
    // Verificar que se está cargando correctamente el gasto por ID
    console.log("🔍 Obtener gasto por ID:", id);
    console.log("🔍 Gasto encontrado:", gasto);
    console.log("🔍 Tipos de Gasto:", tiposGasto);
    console.log("🔍 Proveedores:", proveedores);
    console.log("🔍 Sucursales:", sucursales);
    console.log("🔍 Cotizaciones:", cotizaciones);

    res.json({
      gasto,
      opciones: {
        tiposGasto,
        proveedores,
        sucursales,
        cotizaciones,
      },
    });
  } catch (error) {
    console.error("Error al obtener gasto por ID:", error);
    res.status(500).json({ message: "Error al obtener gasto" });
  }
};

export const getTiposGasto = async (req, res) => {
  try {
    const [tiposGasto] = await db.query("SELECT * FROM tipos_gasto");
    res.json(tiposGasto);
  } catch (error) {
    console.error("Error al obtener tipos de gasto:", error);
    res.status(500).json({ message: "Error al obtener tipos de gasto" });
  }
};

export const getProveedores = async (req, res) => {
  try {
    const [proveedores] = await db.query(
      "SELECT id, nombre FROM proveedores WHERE estado = 'activo'"
    );
    res.json(proveedores);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    res.status(500).json({ message: "Error al obtener proveedores" });
  }
};

export const actualizarEstadoGasto = async (req, res) => {
  const { id } = req.params;
  const { estado, motivo_rechazo } = req.body;

  // … (validaciones previas, como ya tenéis) …

  try {
    // 1) Cambio de estado en la tabla gastos
    await db.query(
      `UPDATE gastos 
         SET estado = ?, motivo_rechazo = ?, updated_at = NOW() 
       WHERE id = ?`,
      [estado, motivo_rechazo || null, id]
    );

    // 2) Si el nuevo estado es 'aprobado', genero la solicitud de pago
    if (estado === "aprobado") {
      // 2.1) Verificar que aún no exista
      const [existe] = await db.query(
        `SELECT id 
           FROM solicitudes_pago 
          WHERE gasto_id = ?`,
        [id]
      );
      if (existe.length === 0) {
        // 2.2) Obtener datos del gasto para la solicitud
        const [[gasto]] = await db.query(
          `SELECT usuario_id AS usuario_solicita_id,
                  proveedor_id,
                  total       AS monto_total,
                  total       AS monto_pagado,   -- arranca en 0 si queréis abonos
                  moneda,
                  tasa_cambio
             FROM gastos
            WHERE id = ?`,
          [id]
        );

        // 2.3) Generar un código único SP-00001, SP-00002…
        const [[{ maxId }]] = await db.query(
          `SELECT MAX(id) AS maxId FROM solicitudes_pago`
        );
        const nextId = (maxId || 0) + 1;
        const codigo = `SP-${String(nextId).padStart(5, "0")}`;

        // 2.4) Insertar en solicitudes_pago con estado 'por_pagar'
        await db.query(
          `INSERT INTO solicitudes_pago (
              codigo,
              gasto_id,
              usuario_solicita_id,
              usuario_aprueba_id,
              proveedor_id,
              monto_total,
              monto_pagado,
              estado,
              fecha_solicitud,
              created_at,
              updated_at,
              moneda,
              tasa_cambio
            ) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW(),NOW(),?,?)`,
          [
            codigo,
            id,
            gasto.usuario_solicita_id,
            req.session.usuario.id, // quien aprueba
            gasto.proveedor_id,
            gasto.monto_total,
            0, // si usáis pagos parciales
            "por_pagar",
            gasto.moneda,
            gasto.tasa_cambio,
          ]
        );
      }
    }

    res.json({ message: "Estado de gasto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar estado del gasto:", error);
    res.status(500).json({ message: "Error interno al actualizar estado" });
  }
};
