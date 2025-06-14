// controllers/gastos.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";

// controllers/gastos.controller.js
export const getGastos = async (req, res) => {
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 5;
  const offset = (page - 1) * limit;
  const q = (req.query.search || "").trim();

  try {
    // 1) TOTAL filtrado
    const [[{ total }]] = await db.query(
      q
        ? `SELECT COUNT(*) AS total
            FROM gastos g
            LEFT JOIN proveedores p ON p.id = g.proveedor_id
            WHERE g.codigo        LIKE ? OR
            p.nombre        LIKE ? OR
            g.concepto_pago LIKE ?`
        : `SELECT COUNT(*) AS total FROM gastos`,
      q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []
    );

    // 2) LISTA paginada filtrada
    const [gastos] = await db.query(
      `
      SELECT g.id,
      g.codigo,
        g.fecha,
        g.total,
        g.estado,
        g.motivo_rechazo,
        g.tipo_gasto_id,                 
        tg.nombre        AS tipo_gasto,  
        p.nombre         AS proveedor,
        s.nombre         AS sucursal,
        g.concepto_pago,
        g.descripcion, 
        g.subtotal,
        g.impuesto,
        g.moneda
        g.porcentaje_iva, 
        g.tasa_cambio,
        FROM gastos g
        LEFT JOIN proveedores p ON p.id = g.proveedor_id
        LEFT JOIN sucursales  s ON s.id = g.sucursal_id
        LEFT JOIN tipos_gasto tg ON tg.id = g.tipo_gasto_id
      ${
        q
          ? `WHERE g.codigo        LIKE ? OR
            p.nombre        LIKE ? OR
            g.concepto_pago LIKE ?`
          : ""
      }
      ORDER BY g.fecha DESC, g.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []
    );

    res.json({ data: gastos, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error interno" });
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

    let estadoEdit = gastoExistente.estado === "rechazado" ? "pendiente" : null;

    // Obtener datos del body o del FormData
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

    // Manejar el documento si se subió uno nuevo
    const documento = req.file ? req.file.key : undefined;

    // Validar y calcular valores
    const subtotalNum = parseFloat(subtotal);
    if (isNaN(subtotalNum)) {
      return res.status(400).json({ message: "Subtotal inválido." });
    }

    const ivaNum = parseFloat(porcentaje_iva);
    if (isNaN(ivaNum)) {
      return res.status(400).json({ message: "Porcentaje de IVA inválido." });
    }

    const impuesto = parseFloat(((subtotalNum * ivaNum) / 100).toFixed(2));
    const total = parseFloat((subtotalNum + impuesto).toFixed(2));

    // Validar estado
    const estadosPermitidos = ["pendiente", "rechazado"];
    let nuevoEstado = estadoEdit || gastoExistente.estado;
    if (estado && estadosPermitidos.includes(estado)) {
      nuevoEstado = estado;
    }
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
        ${documento ? "documento = ?," : ""}
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
        ...(documento ? [documento] : []),
        id,
      ]
    );

    // Obtener el gasto actualizado
    const [[gastoActualizado]] = await db.query(
      "SELECT * FROM gastos WHERE id = ?",
      [id]
    );

    // Generar URL prefirmada si hay documento
    let urlFacturaFirmada = null;
    if (gastoActualizado.documento) {
      urlFacturaFirmada = generarUrlPrefirmadaLectura(
        gastoActualizado.documento
      );
    }

    res.json({
      message: "Gasto actualizado",
      data: {
        ...gastoActualizado,
        urlFacturaFirmada,
      },
    });
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

export const getGastoById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Consultar el gasto, incluyendo la columna url_factura
    const [[gasto]] = await db.query(
      `
      SELECT 
        g.*,
        g.url_factura,                 -- incluimos la columna que guarda la "key" en S3
        p.nombre AS proveedor_nombre, 
        p.id AS proveedor_id,
        s.nombre AS sucursal_nombre, 
        s.id AS sucursal_id,
        c.codigo_referencia AS cotizacion_codigo, 
        c.codigo_referencia AS codigo,
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

    // 1.5) Si existe un valor en gasto.url_factura, generamos la URL prefirmada para lectura
    let urlFacturaFirmada = null;
    if (gasto.url_factura) {
      // Por defecto, la URL expira en 300 segundos (5 minutos). Puedes ajustar el segundo parámetro si necesitas más o menos tiempo.
      urlFacturaFirmada = generarUrlPrefirmadaLectura(gasto.url_factura);
    }

    // 2) Obtener listas para poblar los dropdowns en el frontend
    const [tiposGasto] = await db.query("SELECT id, nombre FROM tipos_gasto");
    const [proveedores] = await db.query(
      "SELECT id, nombre FROM proveedores WHERE estado = 'activo'"
    );
    const [sucursales] = await db.query("SELECT id, nombre FROM sucursales");
    const [cotizaciones] = await db.query(
      "SELECT id, codigo_referencia AS codigo FROM cotizaciones"
    );
    console.log("Cotizaciones obtenidas:", cotizaciones);

    // 3) Enviar la respuesta JSON, añadiendo urlFacturaFirmada dentro del objeto "gasto"
    res.json({
      gasto: {
        ...gasto,
        urlFacturaFirmada, // Será null si no había factura, o la URL firmada si sí existe
      },
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
