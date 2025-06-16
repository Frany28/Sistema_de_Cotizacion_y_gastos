// controllers/solicitudes_pago.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js"; // ─► NUEVO

/* 1. LISTAR */
export const obtenerSolicitudesPago = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const { estado } = req.query;

  try {
    // total
    let countSQL = "SELECT COUNT(*) AS total FROM solicitudes_pago";
    const countParams = [];
    if (estado) {
      countSQL += " WHERE estado = ?";
      countParams.push(estado);
    }
    const [[{ total }]] = await db.query(countSQL, countParams);

    // data
    let dataSQL = `
      SELECT 
        sp.id,
        sp.codigo,
        sp.gasto_id,
        sp.usuario_solicita_id,
        sp.usuario_aprueba_id,
        p.nombre AS proveedor_nombre,
        sp.monto_total    AS monto,
        sp.monto_pagado   AS pagado,
        sp.moneda,
        sp.fecha_solicitud AS fecha,
        sp.estado
      FROM solicitudes_pago sp
      LEFT JOIN proveedores p ON p.id = sp.proveedor_id
    `;
    const dataParams = [];
    if (estado) {
      dataSQL += " WHERE sp.estado = ?";
      dataParams.push(estado);
    }
    dataSQL += `
      ORDER BY sp.fecha_solicitud DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [solicitudes] = await db.query(dataSQL, dataParams);

    return res.json({ solicitudes, total, page, limit });
  } catch (error) {
    console.error("Error al listar solicitudes de pago:", error);
    return res
      .status(500)
      .json({ message: "Error al listar solicitudes de pago" });
  }
};

/* 2. DETALLE */
export const obtenerSolicitudPagoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [[sol]] = await db.execute(
      `SELECT sp.*, p.nombre AS proveedor_nombre
         FROM solicitudes_pago sp
         LEFT JOIN proveedores p ON p.id = sp.proveedor_id
        WHERE sp.id = ?`,
      [id]
    );

    if (!sol)
      return res.status(404).json({ message: "Solicitud no encontrada" });

    const usuarioFirma = req.session.usuario?.ruta_firma || null;

    const [bancosDisponibles] = await db.execute(
      `SELECT id, nombre, identificador
         FROM bancos
        WHERE (moneda = ? OR ? IS NULL) AND estado = 'activo'`,
      [sol.moneda, sol.moneda]
    );

    /* ---------- URL pre-firmada para el comprobante ---------- */
    const comprobante_url = sol.ruta_comprobante
      ? await generarUrlPrefirmadaLectura(sol.ruta_comprobante, 600)
      : null;

    res.json({
      ...sol,
      usuario_firma: usuarioFirma,
      bancosDisponibles,
      comprobante_url, // ─► NUEVO
    });
  } catch (error) {
    console.error("Error al obtener solicitud de pago:", error);
    res.status(500).json({ message: "Error interno al obtener la solicitud" });
  }
};

/* 3. EDITAR (solo estado = por_pagar) */
export const actualizarSolicitudPago = async (req, res) => {
  const { id } = req.params;
  const campos = req.body;

  const [[s]] = await db.execute(
    "SELECT estado FROM solicitudes_pago WHERE id = ?",
    [id]
  );
  if (!s) return res.status(404).json({ message: "Solicitud no encontrada" });
  if (s.estado !== "por_pagar") {
    return res
      .status(400)
      .json({ message: "Solo se puede modificar cuando está por pagar" });
  }

  const setCols = Object.keys(campos)
    .map((k) => `${k} = ?`)
    .join(", ");
  await db.execute(`UPDATE solicitudes_pago SET ${setCols} WHERE id = ?`, [
    ...Object.values(campos),
    id,
  ]);

  res.json({ message: "Solicitud actualizada correctamente" });
};

/* 4. CANCELAR (solo estado = por_pagar) */
export const cancelarSolicitudPago = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;

  const [[s]] = await db.execute(
    "SELECT estado FROM solicitudes_pago WHERE id = ?",
    [id]
  );
  if (!s) return res.status(404).json({ message: "Solicitud no encontrada" });
  if (s.estado !== "por_pagar") {
    return res
      .status(400)
      .json({ message: "Solo se puede cancelar cuando está por pagar" });
  }

  await db.execute(
    `UPDATE solicitudes_pago
        SET estado = 'cancelada',
            observaciones = CONCAT(IFNULL(observaciones, ''), '\nCancelada: ', ?)
      WHERE id = ?`,
    [motivo || "Sin motivo especificado", id]
  );

  res.json({ message: "Solicitud cancelada" });
};

/* 5. PAGAR */
export const pagarSolicitudPago = async (req, res) => {
  const { id } = req.params;
  const {
    metodo_pago,
    banco_id: rawBancoId,
    referencia_pago,
    observaciones,
    fecha_pago,
  } = req.body;
  const comprobanteFile = req.file;

  const bancoId = metodo_pago === "Efectivo" ? null : rawBancoId || null;
  const usuarioFirmaId = req.user?.id;

  try {
    /* --- validar solicitud --- */
    const [[sol]] = await db.execute(
      `SELECT estado, monto_total, moneda, tasa_cambio
         FROM solicitudes_pago
        WHERE id = ?`,
      [id]
    );
    if (!sol)
      return res.status(404).json({ message: "Solicitud no encontrada." });
    if (sol.estado !== "por_pagar") {
      return res
        .status(400)
        .json({ message: `Estado inválido: ${sol.estado}` });
    }

    /* --- clave real del comprobante --- */
    const rutaComprobante = comprobanteFile ? comprobanteFile.key : null;

    const fechaPagoFinal = fecha_pago ? new Date(fecha_pago) : new Date();

    /* --- actualizar solicitud --- */
    await db.execute(
      `UPDATE solicitudes_pago
          SET banco_id         = ?,
              metodo_pago      = ?,
              referencia_pago  = ?,
              ruta_comprobante = ?,
              observaciones    = ?,
              fecha_pago       = ?,
              usuario_firma_id = ?,
              estado           = 'pagada',
              monto_pagado     = monto_total
        WHERE id = ?`,
      [
        bancoId,
        metodo_pago,
        referencia_pago,
        rutaComprobante,
        observaciones || null,
        fechaPagoFinal,
        usuarioFirmaId,
        id,
      ]
    );

    /* --- histórico --- */
    await db.execute(
      `INSERT INTO pagos_realizados
         (solicitud_pago_id,
          usuario_id,
          metodo_pago,
          banco_id,
          referencia_pago,
          ruta_comprobante,
          observaciones,
          fecha_pago,
          monto_pagado,
          moneda,
          tasa_cambio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        usuarioFirmaId,
        metodo_pago,
        bancoId,
        referencia_pago,
        rutaComprobante,
        observaciones || null,
        fechaPagoFinal,
        sol.monto_total,
        sol.moneda,
        sol.tasa_cambio,
      ]
    );

    res.json({
      message: "Pago registrado y guardado en histórico.",
      solicitud_id: id,
    });
  } catch (error) {
    console.error("Error al registrar pago:", error);
    res.status(500).json({ message: "Error interno al registrar el pago." });
  }
};
