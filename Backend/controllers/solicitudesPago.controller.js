// controllers/solicitudes_pago.controller.js
import db from "../config/database.js";

/* -----------------------------------------------------------
   1. LISTAR SOLICITUDES (paginado + filtro opcional por estado)
----------------------------------------------------------- */
/* -----------------------------------------------------------
   1. LISTAR SOLICITUDES (paginado + filtro opcional por estado)
----------------------------------------------------------- */
export const obtenerSolicitudesPago = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  try {
    const where = estado ? "WHERE sp.estado = ?" : "";
    const params = estado
      ? [estado, Number(limit), Number(offset)]
      : [Number(limit), Number(offset)];

    const [rows] = await db.execute(
      `SELECT sp.*, p.nombre AS proveedor_nombre,
              (sp.monto_total - sp.monto_pagado) AS saldo_pendiente
         FROM solicitudes_pago sp
         LEFT JOIN proveedores p ON p.id = sp.proveedor_id
       ${where}
       ORDER BY sp.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM solicitudes_pago sp ${where}`,
      estado ? [estado] : []
    );

    res.json({
      solicitudes: rows,
      total: countRows[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error al listar solicitudes de pago:", error);
    res.status(500).json({ message: "Error al obtener solicitudes de pago" });
  }
};

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

    if (!sol) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    const usuarioFirma = req.session.usuario?.ruta_firma || null;
    console.log("Usuario autenticado:", req.session.usuario);

    const [bancosDisponibles] = await db.execute(
      `SELECT id, nombre, identificador 
       FROM bancos 
       WHERE (moneda = ? OR ? IS NULL) 
         AND estado = 'activo'`,
      [sol.moneda, sol.moneda]
    );

    res.json({
      ...sol,
      usuario_firma: usuarioFirma, // Enviamos la firma del usuario autenticado
      bancosDisponibles,
    });
  } catch (error) {
    console.error("Error al obtener solicitud de pago:", error);
    res.status(500).json({ message: "Error interno al obtener la solicitud" });
  }
};

/* 3. EDITAR (solo mientras estado = por_pagar) */
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

/* 4. CANCELAR (solo si está por_pagar) */
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

  // Si es efectivo, no requerimos banco
  const bancoId = metodo_pago === "Efectivo" ? null : rawBancoId || null;
  // ID del usuario autenticado (de tu middleware de auth)
  const usuarioFirmaId = req.user?.id;

  try {
    // 1) Obtenemos la solicitud y validamos estado
    const [[sol]] = await db.execute(
      `SELECT estado, monto_total, moneda, tasa_cambio
         FROM solicitudes_pago
        WHERE id = ?`,
      [id]
    );
    if (!sol) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }
    if (sol.estado !== "por_pagar") {
      return res
        .status(400)
        .json({ message: `Estado inválido: ${sol.estado}` });
    }

    // 2) Preparamos datos para la actualización
    const rutaComprobante = comprobanteFile
      ? `/uploads/comprobantes/${comprobanteFile.filename}`
      : null;
    const fechaPagoFinal = fecha_pago ? new Date(fecha_pago) : new Date();

    // 3) Actualizamos la solicitud de pago
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

    // 4) Insertamos el pago en el histórico
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

    return res.status(200).json({
      message: "Pago registrado y guardado en histórico.",
      solicitud_id: id,
    });
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return res
      .status(500)
      .json({ message: "Error interno al registrar el pago." });
  }
};
