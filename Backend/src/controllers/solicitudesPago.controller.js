// controllers/solicitudesPago.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import { s3 } from "../utils/s3.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generarHTMLOrdenPago } from "../../templates/generarHTMLOrdenDePago.js";

async function firmaToDataUrl(key) {
  if (!key) return null; // sin firma
  const Bucket = process.env.S3_BUCKET;
  const { Body } = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  const chunks = [];
  for await (const chunk of Body) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  const ext = key.split(".").pop().toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext; // png, gif…
  return `data:image/${mime};base64,${buffer.toString("base64")}`;
}

export const generarPDFSolicitudPago = async (req, res) => {
  const { id } = req.params;

  /* ---------- 1. Consulta completa ---------- */
  const [[row]] = await db.execute(
    `
    SELECT  sp.*,
            g.codigo                         AS gasto_codigo,
            p.nombre                         AS proveedor_nombre,
            b.nombre                         AS banco_nombre,

            us.nombre                        AS solicita_nombre,
            us.firma                         AS solicita_firma,

            ur.nombre                        AS revisa_nombre,
            ur.firma                         AS revisa_firma,

            up.nombre                        AS aprueba_nombre,
            up.firma                         AS aprueba_firma
    FROM    solicitudes_pago sp
    LEFT JOIN gastos      g  ON g.id  = sp.gasto_id
    LEFT JOIN proveedores p  ON p.id  = sp.proveedor_id
    LEFT JOIN bancos      b  ON b.id  = sp.banco_id
    LEFT JOIN usuarios    us ON us.id = sp.usuario_solicita_id
    LEFT JOIN usuarios    ur ON ur.id = sp.usuario_revisa_id
    LEFT JOIN usuarios    up ON up.id = sp.usuario_aprueba_id
    WHERE   sp.id = ?`,
    [id]
  );

  if (!row)
    return res.status(404).json({ message: "Solicitud de pago no encontrada" });

  /* ---------- 2. Firmas → Base64 ---------- */
  const [firmaSolicita, firmaRevisa, firmaAprueba] = await Promise.all([
    firmaToDataUrl(row.solicita_firma),
    firmaToDataUrl(row.revisa_firma),
    firmaToDataUrl(row.aprueba_firma),
  ]);

  /* ---------- 3. Armar objeto para el template ---------- */
  const datos = {
    /* cabecera */
    codigo: row.codigo,
    fecha_solicitud: row.fecha_solicitud,
    estado: row.estado,
    solicitado_por: row.solicita_nombre,
    autorizado_por: row.revisa_nombre,
    aprobado_por: row.aprueba_nombre,

    /* firmas */
    firmaSolicita,
    firmaAutoriza: firmaRevisa,
    firmaAprueba,

    /* método / banco / ref */
    metodo_pago: row.metodo_pago,
    banco: row.banco_nombre || "—",
    referencia: row.referencia_pago || "—",

    /* montos */
    subtotal: row.monto_total - (row.impuesto ?? 0),
    porcentaje_iva: row.porcentaje_iva ?? 0,
    impuesto: row.impuesto ?? 0,
    total: row.monto_total,

    /* otros */
    gasto_codigo: row.gasto_codigo || "—",
    proveedor: row.proveedor_nombre || "—",
    observaciones: row.observaciones,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const html = generarHTMLOrdenPago(datos, "final");

  /* ---------- 4. Puppeteer → PDF ---------- */
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
  });

  await browser.close();

  /* ---------- 5. Enviar ---------- */
  res
    .set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=orden_pago_${row.codigo}.pdf`,
    })
    .send(pdfBuffer);
};

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
        sp.usuario_revisa_id,
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
              ur.nombre AS usuario_revisa_nombre,
              up.nombre AS usuario_aprueba_nombre,
              b.nombre  AS banco_nombre
         FROM solicitudes_pago sp
         LEFT JOIN gastos      g  ON g.id  = sp.gasto_id 
         LEFT JOIN proveedores p  ON p.id  = sp.proveedor_id
         LEFT JOIN usuarios    us ON us.id = sp.usuario_solicita_id
         LEFT JOIN usuarios    ur ON ur.id = sp.usuario_revisa_id  
         LEFT JOIN usuarios    up ON up.id = sp.usuario_aprueba_id 
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
  let {
    metodo_pago,
    banco_id: rawBancoId,
    referencia_pago,
    observaciones,
    fecha_pago,
  } = req.body;

  /* ---------- 1. VALIDACIONES POR TIPO DE PAGO ---------- */
  if (!metodo_pago)
    return res.status(400).json({ message: "Método de pago requerido" });

  const metodo = metodo_pago.trim().toLowerCase();

  if (metodo === "efectivo") {
    rawBancoId = null;
    referencia_pago = null;
  } else {
    if (!rawBancoId)
      return res.status(400).json({ message: "Banco requerido" });
    if (!referencia_pago)
      return res.status(400).json({ message: "Referencia de pago requerida" });
    if (!req.file)
      return res
        .status(400)
        .json({ message: "Comprobante (PDF o imagen) requerido" });
  }

  /* ---------- 2. VARIABLES DERIVADAS ---------- */
  const bancoId = metodo === "efectivo" ? null : rawBancoId;
  const comprobanteFile = req.file || null;
  const rutaComprobante = comprobanteFile ? comprobanteFile.key : null;
  const nombreOriginal = comprobanteFile ? comprobanteFile.originalname : null;
  const extension = nombreOriginal ? nombreOriginal.split(".").pop() : null;
  const tamanioBytes = comprobanteFile ? comprobanteFile.size : null;
  const fechaPagoFinal = fecha_pago ? new Date(fecha_pago) : new Date();
  const usuarioApruebaId = req.user?.id;

  try {
    /* ---------- 3. COMPROBAR ESTADO ---------- */
    const [[sol]] = await db.execute(
      "SELECT estado, monto_total, moneda, tasa_cambio FROM solicitudes_pago WHERE id = ?",
      [id]
    );
    if (!sol)
      return res.status(404).json({ message: "Solicitud no encontrada." });
    if (sol.estado !== "por_pagar")
      return res
        .status(400)
        .json({ message: `Estado inválido: ${sol.estado}` });

    /* ---------- 4. ACTUALIZAR SOLICITUD ---------- */
    await db.execute(
      `UPDATE solicitudes_pago
          SET banco_id         = ?,
              metodo_pago      = ?,
              referencia_pago  = ?,
              ruta_comprobante = ?,
              observaciones    = ?,
              fecha_pago       = ?,
              usuario_aprueba_id = ?,
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
        usuarioApruebaId,
        id,
      ]
    );

    /* ---------- 5. HISTÓRICO ---------- */
    await db.execute(
      `INSERT INTO pagos_realizados
         (solicitud_pago_id, usuario_id, metodo_pago, banco_id,
          referencia_pago, ruta_comprobante, observaciones, fecha_pago,
          monto_pagado, moneda, tasa_cambio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        usuarioApruebaId,
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

    /* ---------- 6. ARCHIVO (solo si hay) ---------- */
    if (rutaComprobante) {
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
          usuarioApruebaId,
        ]
      );

      await db.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, usuarioId, fechaHora, ip, userAgent, detalles)
         VALUES (?, 'subida', ?, NOW(), ?, ?, ?)`,
        [
          resArchivo.insertId,
          usuarioApruebaId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({ nombreOriginal, extension, ruta: rutaComprobante }),
        ]
      );
    }

    return res.json({
      message: "Pago registrado correctamente.",
      solicitud_id: id,
    });
  } catch (error) {
    console.error("Error al registrar pago:", error);
    return res
      .status(500)
      .json({ message: "Error interno al registrar el pago." });
  }
};
