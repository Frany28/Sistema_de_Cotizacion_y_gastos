// controllers/solicitudesPago.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";

/* ============================================================
 * 1. LISTAR SOLICITUDES DE PAGO
 * ========================================================== */
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

/* ============================================================
 * 2. DETALLE DE UNA SOLICITUD
 * ========================================================== */
export const obtenerSolicitudPagoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [[sol]] = await db.execute(
      `SELECT sp.*,
              g.codigo  AS gasto_codigo,      -- trae el código del gasto
              p.nombre  AS proveedor_nombre,
              us.nombre AS usuario_solicita_nombre,
              ua.nombre AS usuario_aprueba_nombre,
              b.nombre  AS banco_nombre
         FROM solicitudes_pago sp
         LEFT JOIN gastos      g  ON g.id  = sp.gasto_id   -- ← JOIN añadido
         LEFT JOIN proveedores p  ON p.id  = sp.proveedor_id
         LEFT JOIN usuarios    us ON us.id = sp.usuario_solicita_id
         LEFT JOIN usuarios    ua ON ua.id = sp.usuario_aprueba_id
         LEFT JOIN bancos      b  ON b.id  = sp.banco_id
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

    const comprobante_url = sol.ruta_comprobante
      ? await generarUrlPrefirmadaLectura(sol.ruta_comprobante, 600)
      : null;

    res.json({
      ...sol,
      usuario_firma: usuarioFirma,
      bancosDisponibles,
      comprobante_url,
    });
  } catch (err) {
    console.error("Error al obtener solicitud de pago:", err);
    res.status(500).json({ message: "Error interno al obtener la solicitud" });
  }
};

/* ============================================================
 * 3. ACTUALIZAR (cuando estado = 'por_pagar')
 * ========================================================== */
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

  return res.json({ message: "Solicitud actualizada correctamente" });
};

/* ============================================================
 * 4. CANCELAR (cuando estado = 'por_pagar')
 * ========================================================== */
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
        SET estado       = 'cancelada',
            observaciones = CONCAT(
              IFNULL(observaciones, ''), 
              '\nCancelada: ', ?
            )
      WHERE id = ?`,
    [motivo || "Sin motivo especificado", id]
  );

  return res.json({ message: "Solicitud cancelada" });
};

/* ============================================================
 * 5. PAGAR
 * ========================================================== */
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

  // Banco nulo si es efectivo
  const bancoId = metodo_pago === "Efectivo" ? null : rawBancoId || null;
  const usuarioFirmaId = req.user?.id;

  try {
    // 1. Validar existencia y estado
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

    // 2. Preparar datos del comprobante
    const rutaComprobante = comprobanteFile ? comprobanteFile.key : null;
    const nombreOriginal = comprobanteFile
      ? comprobanteFile.originalname
      : null;
    const extension = nombreOriginal ? nombreOriginal.split(".").pop() : null;
    const tamanioBytes = comprobanteFile ? comprobanteFile.size : null;
    const fechaPagoFinal = fecha_pago ? new Date(fecha_pago) : new Date();

    // 3. Actualizar solicitud de pago
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

    // 4. Insertar en histórico de pagos
    await db.execute(
      `INSERT INTO pagos_realizados
         (solicitud_pago_id, usuario_id, metodo_pago, banco_id,
          referencia_pago, ruta_comprobante, observaciones, fecha_pago,
          monto_pagado, moneda, tasa_cambio)
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

    // 5. Registrar archivo en archivos + evento en eventosArchivo
    if (rutaComprobante) {
      // 5.1. Insertar en archivos
      const [resArchivo] = await db.query(
        `INSERT INTO archivos
           (registroTipo, registroId, nombreOriginal, extension, rutaS3, tamanioBytes, subidoPor, creadoEn, actualizadoEn)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          "comprobantesPagos",
          id,
          nombreOriginal,
          extension,
          rutaComprobante,
          tamanioBytes,
          usuarioFirmaId,
        ]
      );
      const archivoId = resArchivo.insertId;

      // 5.2. Insertar en eventosArchivo
      await db.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, usuarioId, fechaHora, ip, userAgent, detalles)
         VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          "subida",
          usuarioFirmaId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({ nombreOriginal, extension, ruta: rutaComprobante }),
        ]
      );
    }

    // 6. Respuesta de éxito
    return res.json({
      message: "Pago registrado, histórico y archivo guardado correctamente.",
      solicitud_id: id,
    });
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return res
      .status(500)
      .json({ message: "Error interno al registrar el pago." });
  }
};
