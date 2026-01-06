// controllers/solicitudesPago.controller.js
import db from "../config/database.js";
import {
  s3,
  generarUrlPrefirmadaLectura,
  subirBufferAS3,
  borrarObjetoAS3,
} from "../utils/s3.js";
import { obtenerOcrearGrupoComprobante } from "../utils/gruposArchivos.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generarHTMLOrdenPago } from "../../templates/generarHTMLOrdenDePago.js";

// 🔹 NUEVOS IMPORTS PARA EL LOGO LOCAL
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

async function firmaToDataUrl(key) {
  console.log("🪣 [DEBUG] Intentando leer del bucket:", process.env.S3_BUCKET);
  console.log("🪣 [DEBUG] Clave que se intenta leer:", key);
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

  // Opcional: si quieres generar el PDF de un abono específico
  const pagoRealizadoId = req.query?.pagoRealizadoId
    ? Number(req.query.pagoRealizadoId)
    : null;

  let browser;

  try {
    /* ---------- 1. Consulta completa (con datos del último pago_realizado) ---------- */
    const [[row]] = await db.execute(
      `
      SELECT  
              sp.*,
              g.codigo              AS gasto_codigo,
              g.total               AS gasto_total,
              g.moneda              AS gasto_moneda,
              g.tasa_cambio         AS gasto_tasa_cambio,
              g.documento           AS gasto_documento,
              tg.nombre             AS tipo_gasto_nombre,
              p.nombre              AS proveedor_nombre,
              p.rif                 AS proveedor_rif,
              p.telefono            AS proveedor_telefono,
              p.email               AS proveedor_email,

              -- Banco original (solicitud)
              b.nombre              AS banco_nombre_solicitud,

              us.nombre             AS solicita_nombre,
              us.firma              AS solicita_firma,

              ur.nombre             AS revisa_nombre,
              ur.firma              AS revisa_firma,

              up.nombre             AS aprueba_nombre,
              up.firma              AS aprueba_firma,

              -- ====== ÚLTIMO PAGO REALIZADO (o uno específico) ======
              pr.id                 AS pago_realizado_id,
              pr.fecha_pago         AS pago_fecha_pago,
              pr.metodo_pago        AS pago_metodo_pago,
              pr.referencia_pago    AS pago_referencia_pago,
              pr.ruta_comprobante   AS pago_ruta_comprobante,
              pr.banco_id           AS pago_banco_id,

              bp.nombre             AS banco_nombre_pago,

              -- ====== CAMPOS FINALES PARA EL PDF (compatibles con lo viejo) ======
              COALESCE(pr.metodo_pago, sp.metodo_pago) AS metodo_pago_final,
              COALESCE(pr.referencia_pago, sp.referencia_pago) AS referencia_pago_final,
              COALESCE(pr.ruta_comprobante, sp.ruta_comprobante) AS ruta_comprobante_final,
              COALESCE(bp.nombre, b.nombre) AS banco_nombre_final,
              COALESCE(pr.fecha_pago, sp.fecha_pago) AS fecha_pago_final

      FROM    solicitudes_pago sp
      LEFT JOIN gastos g         ON g.id = sp.gasto_id
      LEFT JOIN tipos_gasto tg   ON tg.id = g.tipo_gasto_id
      LEFT JOIN proveedores p    ON p.id = sp.proveedor_id
      LEFT JOIN bancos b         ON b.id = sp.banco_id
      LEFT JOIN usuarios us      ON us.id = sp.usuario_solicita_id
      LEFT JOIN usuarios ur      ON ur.id = sp.usuario_revisa_id
      LEFT JOIN usuarios up      ON up.id = sp.usuario_aprueba_id

      LEFT JOIN pagos_realizados pr
        ON pr.id = (
          SELECT pr2.id
          FROM pagos_realizados pr2
          WHERE pr2.solicitud_pago_id = sp.id
            AND ( ? IS NULL OR pr2.id = ? )
          ORDER BY pr2.fecha_pago DESC, pr2.id DESC
          LIMIT 1
        )

      LEFT JOIN bancos bp ON bp.id = pr.banco_id

      WHERE sp.id = ?
      LIMIT 1
      `,
      [pagoRealizadoId, pagoRealizadoId, id]
    );

    if (!row) {
      return res
        .status(404)
        .json({ message: "Solicitud de pago no encontrada" });
    }

    /* ---------- 2. Firmas → Base64 ---------- */
    const [firmaSolicita, firmaRevisa, firmaAprueba] = await Promise.all([
      firmaToDataUrl(row.solicita_firma),
      firmaToDataUrl(row.revisa_firma),
      firmaToDataUrl(row.aprueba_firma),
    ]);

    /* ---------- 3. Logo local → Base64 ---------- */
    let logo = null;
    try {
      const archivoActual = fileURLToPath(import.meta.url);
      const carpetaActual = path.dirname(archivoActual);
      const rutaLogo = path.join(
        carpetaActual,
        "..",
        "..",
        "styles",
        "Logo Operaciones Logisticas Falcon.jpg"
      );
      const bufferLogo = fs.readFileSync(rutaLogo);
      logo = `data:image/jpeg;base64,${bufferLogo.toString("base64")}`;
    } catch (err) {
      console.error("No se pudo cargar el logo de Orden de Pago:", err);
    }

    /* ---------- 4. Firmar URLs de comprobante y documento gasto ---------- */
    let comprobanteUrl = null;
    if (row.ruta_comprobante_final) {
      comprobanteUrl = await generarUrlPrefirmadaLectura(
        row.ruta_comprobante_final,
        600
      );
    }

    let gastoDocumentoUrl = null;
    if (row.gasto_documento) {
      gastoDocumentoUrl = await generarUrlPrefirmadaLectura(
        row.gasto_documento,
        600
      );
    }

    const diferencia = (row.monto_total || 0) - (row.monto_pagado || 0);

    /* ---------- 5. Datos para el template ---------- */
    const datos = {
      codigo: row.codigo,
      fechaSolicitud: row.fecha_solicitud,
      fechaPago: row.fecha_pago_final,
      estado: row.estado,

      solicitadoPor: row.solicita_nombre,
      autorizadoPor: row.revisa_nombre,
      aprobadoPor: row.aprueba_nombre,

      firmaSolicita,
      firmaAutoriza: firmaRevisa,
      firmaAprueba,

      // ✅ AHORA VIENEN DEL ÚLTIMO PAGO (O DE LA SOLICITUD SI NO HAY PAGO)
      metodoPago: row.metodo_pago_final,
      banco: row.banco_nombre_final || "—",
      referencia: row.referencia_pago_final || "—",
      comprobanteUrl,

      montoSolicitado: row.monto_total,
      montoPagado: row.monto_pagado,
      diferencia,
      moneda: row.moneda,
      tasaCambio: row.tasa_cambio,

      observaciones: row.observaciones,

      gasto: {
        codigo: row.gasto_codigo || "—",
        tipoGasto: row.tipo_gasto_nombre || "—",
        total: row.gasto_total || 0,
        moneda: row.gasto_moneda || "—",
        tasaCambio: row.gasto_tasa_cambio || null,
        documentoUrl: gastoDocumentoUrl || null,
      },

      proveedor: row.proveedor_nombre
        ? {
            nombre: row.proveedor_nombre,
            rif: row.proveedor_rif,
            telefono: row.proveedor_telefono,
            email: row.proveedor_email,
          }
        : null,

      createdAt: row.created_at,
      updatedAt: row.updated_at,
      logo,
    };

    const html = generarHTMLOrdenPago(datos, "final");

    /* ---------- 6. Generar PDF ---------- */
    browser = await puppeteer.launch({
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
    browser = null;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="orden_pago_${row.codigo}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    console.error("Error al generar PDF:", error);
    return res.status(500).json({
      message: "Error al generar PDF",
      error: error?.message ?? String(error),
    });
  }
};

async function guardarPdfOrdenPagoPrimerAbono({
  solicitudPagoId,
  pagoRealizadoId,
  usuarioId,
  ip,
  userAgent,
}) {
  let clavePdfOrdenPago = null;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    // 1) Traer data completa de la solicitud (misma consulta base del PDF)
    const [[row]] = await conexion.execute(
      `
      SELECT  
              sp.*,
              g.codigo              AS gasto_codigo,
              g.total               AS gasto_total,
              g.moneda              AS gasto_moneda,
              g.tasa_cambio         AS gasto_tasa_cambio,
              g.documento           AS gasto_documento,
              tg.nombre             AS tipo_gasto_nombre,
              p.nombre              AS proveedor_nombre,
              p.rif                 AS proveedor_rif,
              p.telefono            AS proveedor_telefono,
              p.email               AS proveedor_email,
              b.nombre              AS banco_nombre,

              us.nombre             AS solicita_nombre,
              us.firma              AS solicita_firma,

              ur.nombre             AS revisa_nombre,
              ur.firma              AS revisa_firma,

              up.nombre             AS aprueba_nombre,
              up.firma              AS aprueba_firma
      FROM    solicitudes_pago sp
      LEFT JOIN gastos g         ON g.id = sp.gasto_id
      LEFT JOIN tipos_gasto tg   ON tg.id = g.tipo_gasto_id
      LEFT JOIN proveedores p    ON p.id = sp.proveedor_id
      LEFT JOIN bancos b         ON b.id = sp.banco_id
      LEFT JOIN usuarios us      ON us.id = sp.usuario_solicita_id
      LEFT JOIN usuarios ur      ON ur.id = sp.usuario_revisa_id
      LEFT JOIN usuarios up      ON up.id = sp.usuario_aprueba_id
      WHERE sp.id = ?
      `,
      [solicitudPagoId]
    );

    if (!row) {
      await conexion.rollback();
      return { ok: false, motivo: "Solicitud no encontrada" };
    }

    // 2) Asegurar que este PDF sea del primer abono
    const [[primerAbono]] = await conexion.execute(
      `
      SELECT *
      FROM pagos_realizados
      WHERE solicitud_pago_id = ?
      ORDER BY fecha_pago ASC, id ASC
      LIMIT 1
      `,
      [solicitudPagoId]
    );

    if (!primerAbono) {
      await conexion.rollback();
      return { ok: false, motivo: "No existe primer abono todavía" };
    }

    // Si el primer abono real no coincide con el pagoRealizadoId que acabamos de crear,
    // entonces NO generamos (esto evita generar el PDF si ya existían abonos antes).
    if (Number(primerAbono.id) !== Number(pagoRealizadoId)) {
      await conexion.rollback();
      return { ok: true, omitido: true, motivo: "No es el primer abono" };
    }

    // 3) Evitar duplicado: si ya existe un ordenPago para este pagoRealizadoId, no regenerar
    const [[yaExiste]] = await conexion.execute(
      `
      SELECT id
      FROM archivos
      WHERE registroTipo = 'comprobantesPagos'
        AND registroId = ?
        AND subTipoArchivo = 'ordenPago'
        AND estado = 'activo'
      LIMIT 1
      `,
      [pagoRealizadoId]
    );

    if (yaExiste?.id) {
      await conexion.rollback();
      return { ok: true, omitido: true, motivo: "PDF ya estaba registrado" };
    }

    // 4) Firmas + logo (igual que generarPDFSolicitudPago)
    const solicitaFirma = await firmaToDataUrl(row.solicita_firma);
    const revisaFirma = await firmaToDataUrl(row.revisa_firma);
    const apruebaFirma = await firmaToDataUrl(row.aprueba_firma);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rutaLogo = path.join(__dirname, "../assets/logo.png");
    const logo = fs.existsSync(rutaLogo)
      ? `data:image/png;base64,${fs.readFileSync(rutaLogo).toString("base64")}`
      : null;

    // 5) Comprobante URL (si aplica)
    const comprobanteUrl = row.ruta_comprobante
      ? await generarUrlPrefirmadaLectura(row.ruta_comprobante)
      : null;

    // 6) Construir objeto para template
    const datos = {
      solicitud: {
        id: row.id,
        codigo: row.codigo,
        conceptoPago: row.concepto_pago,
        metodoPago: row.metodo_pago,
        referenciaPago: row.referencia_pago,
        observaciones: row.observaciones,
        moneda: row.moneda,
        tasaCambio: row.tasa_cambio,
        montoTotal: row.monto_total,
        montoPagado: row.monto_pagado,
        estado: row.estado,
        fechaSolicitud: row.fecha_solicitud,
        fechaPago: primerAbono.fecha_pago,
      },
      gasto: row.gasto_id
        ? {
            id: row.gasto_id,
            codigo: row.gasto_codigo,
            total: row.gasto_total || 0,
            moneda: row.gasto_moneda || "—",
            tasaCambio: row.gasto_tasa_cambio || null,
            documentoUrl: row.gasto_documento
              ? await generarUrlPrefirmadaLectura(row.gasto_documento)
              : null,
          }
        : null,
      proveedor: row.proveedor_nombre
        ? {
            nombre: row.proveedor_nombre,
            rif: row.proveedor_rif,
            telefono: row.proveedor_telefono,
            email: row.proveedor_email,
          }
        : null,
      banco: row.banco_nombre ? { nombre: row.banco_nombre } : null,
      firmas: {
        solicita: solicitaFirma,
        revisa: revisaFirma,
        aprueba: apruebaFirma,
      },
      comprobanteUrl,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      logo,
    };

    const html = generarHTMLOrdenPago(datos, "final");

    // 7) Puppeteer → PDF buffer
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

    // 8) Carpeta S3: .../SP-00005/ordenes_pago/...
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const fechaBase = primerAbono?.fecha_pago
      ? new Date(primerAbono.fecha_pago)
      : new Date();
    const anio = fechaBase.getFullYear();
    const mesPalabra = meses[fechaBase.getMonth()];

    const numeroAbono = 1;
    const timestamp = Date.now();

    const nombreOriginal = `ordenPago-${row.codigo}-abono-${String(
      numeroAbono
    ).padStart(4, "0")}-${pagoRealizadoId}-${timestamp}.pdf`;

    const extension = "pdf";
    const tamanioBytes = pdfBuffer.length;

    clavePdfOrdenPago = `comprobantes_pagos/${anio}/${mesPalabra}/${row.codigo}/ordenes_pago/${nombreOriginal}`;

    // 9) Subir a S3
    await subirBufferAS3({
      claveS3: clavePdfOrdenPago,
      buffer: pdfBuffer,
      contentType: "application/pdf",
    });

    // 10) Grupo de archivos (misma utilidad que ya usas)
    const grupoId = await obtenerOcrearGrupoComprobante(
      conexion,
      solicitudPagoId,
      usuarioId
    );

    // 11) Versionado
    const [[ver]] = await conexion.execute(
      `
      SELECT IFNULL(MAX(numeroVersion), 0) AS maxVer
      FROM archivos
      WHERE registroTipo = 'comprobantesPagos'
        AND registroId = ?
        AND subTipoArchivo = 'ordenPago'
      `,
      [pagoRealizadoId]
    );

    const numeroVersion = Number(ver?.maxVer || 0) + 1;

    // 12) Insert archivos (registroId = pagoRealizadoId)
    const [aRes] = await conexion.execute(
      `
      INSERT INTO archivos
        (registroTipo, subTipoArchivo, registroId, grupoArchivoId,
         nombreOriginal, extension, tamanioBytes, numeroVersion,
         rutaS3, estado, esPublico, subidoPor)
      VALUES
        ('comprobantesPagos', 'ordenPago', ?, ?, ?, ?, ?, ?, ?, 'activo', 0, ?)
      `,
      [
        pagoRealizadoId,
        grupoId,
        nombreOriginal,
        extension,
        tamanioBytes,
        numeroVersion,
        clavePdfOrdenPago,
        usuarioId,
      ]
    );

    const archivoId = aRes.insertId;

    // 13) Insert versionesArchivo
    const [vRes] = await conexion.execute(
      `
      INSERT INTO versionesArchivo
        (archivoId, numeroVersion, nombreOriginal, extension,
         tamanioBytes, rutaS3, subidoPor)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        archivoId,
        numeroVersion,
        nombreOriginal,
        extension,
        tamanioBytes,
        clavePdfOrdenPago,
        usuarioId,
      ]
    );

    const versionId = vRes.insertId;

    // 14) Auditoría eventosArchivo
    await conexion.execute(
      `
      INSERT INTO eventosArchivo
        (archivoId, versionId, accion, creadoPor, ip, userAgent, detalles)
      VALUES
        (?, ?, 'subidaArchivo', ?, ?, ?, ?)
      `,
      [
        archivoId,
        versionId,
        usuarioId,
        ip || null,
        userAgent || null,
        JSON.stringify({
          registroTipo: "comprobantesPagos",
          subTipoArchivo: "ordenPago",
          solicitudPagoId: Number(solicitudPagoId),
          pagoRealizadoId: Number(pagoRealizadoId),
          codigoSolicitudPago: row.codigo,
          origen: "abono",
        }),
      ]
    );

    // 15) Storage
    await conexion.execute(
      `
      UPDATE usuarios
      SET usoStorageBytes = usoStorageBytes + ?
      WHERE id = ?
      `,
      [tamanioBytes, usuarioId]
    );

    await conexion.commit();

    return {
      ok: true,
      clavePdfOrdenPago,
      archivoId,
      versionId,
    };
  } catch (error) {
    await conexion.rollback();

    // Si subió a S3 pero falló BD, limpia
    if (clavePdfOrdenPago) {
      try {
        await borrarObjetoAS3(clavePdfOrdenPago);
      } catch (_) {}
    }

    console.error("Error guardando PDF Orden de Pago (auto):", error);
    return { ok: false, error: error?.message || "Error desconocido" };
  } finally {
    conexion.release();
  }
}

/* ============================================================
 * 1. LISTAR SOLICITUDES DE PAGO
 * ========================================================== */
export const obtenerSolicitudesPago = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const { estado } = req.query;
  const search = (req.query.search || "").trim();

  try {
    let whereSQL = "";
    const whereParams = [];

    if (estado && estado !== "todos") {
      whereSQL += (whereSQL ? " AND " : " WHERE ") + "sp.estado = ?";
      whereParams.push(estado);
    }

    if (search) {
      whereSQL +=
        (whereSQL ? " AND " : " WHERE ") +
        `(
          sp.codigo LIKE ? OR
          p.nombre LIKE ? OR
          sp.moneda LIKE ? OR
          sp.estado LIKE ?
        )`;
      whereParams.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    // Total
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
         FROM solicitudes_pago sp
         LEFT JOIN proveedores p ON p.id = sp.proveedor_id
         ${whereSQL}`,
      whereParams
    );

    // Data
    const [solicitudes] = await db.query(
      `
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
      ${whereSQL}
      ORDER BY sp.fecha_solicitud DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      whereParams
    );

    return res.json({ solicitudes, total, page, limit });
  } catch (error) {
    console.error("Error al listar solicitudes de pago:", error);
    return res
      .status(500)
      .json({ message: "Error al listar solicitudes de pago" });
  }
};

/* ============================================================
 * 2. DETALLE DE UNA SOLICITUD (con abonos + saldos)
 * ========================================================== */
export const obtenerSolicitudPagoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Solicitud
    const [[solicitud]] = await db.execute(
      `
      SELECT sp.*,
             g.codigo  AS gasto_codigo,
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
       WHERE sp.id = ?
      `,
      [id]
    );

    if (!solicitud) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    // 2) Firma del usuario (sesión)
    const usuarioFirma = req.session.usuario?.ruta_firma || null;

    // 3) Bancos disponibles según moneda
    const [bancosDisponibles] = await db.execute(
      `
      SELECT id, nombre, identificador
        FROM bancos
       WHERE (moneda = ? OR ? IS NULL)
         AND estado = 'activo'
      `,
      [solicitud.moneda, solicitud.moneda]
    );

    // 4) Comprobante de la solicitud (si aplica)
    const comprobanteUrlSolicitud = solicitud.ruta_comprobante
      ? await generarUrlPrefirmadaLectura(solicitud.ruta_comprobante, 600)
      : null;

    // 5) Listado de abonos (pagos_realizados)
    const [pagosRealizados] = await db.execute(
      `
      SELECT pr.id,
             pr.solicitud_pago_id,
             pr.usuario_id,
             u.nombre AS usuario_nombre,
             pr.metodo_pago,
             pr.referencia_pago,
             pr.banco_id,
             b.nombre AS banco_nombre,
             pr.monto_pagado,
             pr.moneda,
             pr.tasa_cambio,
             pr.monto_pagado_usd,
             pr.fecha_pago,
             pr.ruta_comprobante,
             pr.observaciones,
             pr.created_at
        FROM pagos_realizados pr
        LEFT JOIN usuarios u ON u.id = pr.usuario_id
        LEFT JOIN bancos   b ON b.id = pr.banco_id
       WHERE pr.solicitud_pago_id = ?
       ORDER BY pr.fecha_pago DESC, pr.id DESC
      `,
      [id]
    );

    // 6) Generar URL prefirmada por cada comprobante de abono
    const pagosRealizadosConUrl = await Promise.all(
      pagosRealizados.map(async (pago) => {
        const comprobanteUrl = pago.ruta_comprobante
          ? await generarUrlPrefirmadaLectura(pago.ruta_comprobante, 600)
          : null;

        return {
          ...pago,
          comprobante_url: comprobanteUrl,
        };
      })
    );

    // 7) Totales en USD (la fuente de verdad para validar sobrepagos)
    const [[sumas]] = await db.execute(
      `
      SELECT IFNULL(SUM(monto_pagado_usd), 0) AS total_pagado_usd
        FROM pagos_realizados
       WHERE solicitud_pago_id = ?
      `,
      [id]
    );

    const montoTotalUsd = parseFloat(solicitud.monto_total_usd) || 0;
    const totalPagadoUsd = parseFloat(sumas.total_pagado_usd) || 0;
    const saldoPendienteUsd = Math.max(montoTotalUsd - totalPagadoUsd, 0);

    // 8) Saldo pendiente “en moneda” (referencia con tasa de la solicitud)
    let saldoPendienteMoneda = saldoPendienteUsd;

    if (solicitud.moneda === "VES") {
      const tasaSolicitud = parseFloat(solicitud.tasa_cambio) || 0;
      saldoPendienteMoneda =
        tasaSolicitud > 0 ? saldoPendienteUsd * tasaSolicitud : 0;
    }

    return res.json({
      ...solicitud,
      usuario_firma: usuarioFirma,
      bancosDisponibles,
      comprobante_url: comprobanteUrlSolicitud,

      pagos_realizados: pagosRealizadosConUrl,

      // ✅ Totales/saldos en USD (fuente de verdad)
      total_pagado_usd: totalPagadoUsd,
      saldo_pendiente_usd: saldoPendienteUsd,

      // ✅ Compatibilidad: algunos componentes esperan esto como “cabecera”
      monto_pagado_usd: totalPagadoUsd,

      // ✅ Referencia “en moneda” usando la tasa guardada en solicitud (no es la tasa del día)
      saldo_pendiente_moneda: saldoPendienteMoneda,
    });
  } catch (error) {
    console.error("Error al obtener solicitud de pago:", error);
    return res
      .status(500)
      .json({ message: "Error interno al obtener la solicitud" });
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

export const pagarSolicitudPago = async (req, res) => {
  const { id } = req.params;

  const usuarioApruebaId = req.user?.id ?? req.session?.usuario?.id ?? null;

  const metodoPago = req.body?.metodo_pago;
  const referenciaPago = req.body?.referencia_pago ?? null;
  const bancoId = req.body?.banco_id ?? null;

  const montoPagadoRaw = req.body?.monto_pagado ?? req.body?.monto_abono;
  const tasaCambioRaw = req.body?.tasa_cambio ?? req.body?.tasa_cambio_abono;

  const monedaBody = req.body?.moneda ?? null;
  const observaciones = req.body?.observaciones ?? null;
  const fechaPagoRaw = req.body?.fecha_pago ?? null;

  // Si suben comprobante en el abono (multer-s3 normalmente deja req.file.key)
  const rutaComprobante = req.file?.key ?? null;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.ip ?? null;
  const userAgent = req.headers["user-agent"] ?? null;

  const conexion = await db.getConnection();

  const normalizarFechaMySql = (fechaIso) => {
    if (!fechaIso) return null;
    const fecha = String(fechaIso).replace("T", " ").trim();
    return fecha.length === 16 ? `${fecha}:00` : fecha;
  };

  try {
    if (!usuarioApruebaId) {
      return res.status(401).json({
        message:
          "Sesión inválida: usuario no autenticado (usuarioApruebaId llegó null).",
      });
    }

    if (!metodoPago) {
      return res.status(400).json({ message: "Debe indicar método de pago." });
    }

    const montoPagado = Number(montoPagadoRaw);
    if (!Number.isFinite(montoPagado) || montoPagado <= 0) {
      return res
        .status(400)
        .json({ message: "Debe indicar un monto válido mayor a 0." });
    }

    const tasaCambio =
      tasaCambioRaw !== null && tasaCambioRaw !== undefined
        ? Number(tasaCambioRaw)
        : null;

    if (tasaCambio !== null && !Number.isFinite(tasaCambio)) {
      return res
        .status(400)
        .json({ message: "La tasa de cambio debe ser numérica." });
    }

    const fechaPagoMySql = normalizarFechaMySql(fechaPagoRaw);

    await conexion.beginTransaction();

    // 1) Bloqueo de solicitud
    const [[solicitud]] = await conexion.execute(
      `
        SELECT id, monto_total, monto_pagado, moneda, estado
        FROM solicitudes_pago
        WHERE id = ?
        FOR UPDATE
      `,
      [id]
    );

    if (!solicitud) {
      await conexion.rollback();
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    const monedaFinal = monedaBody ?? solicitud.moneda ?? "USD";
    const montoPagadoActual = Number(solicitud.monto_pagado ?? 0);
    const montoTotal = Number(solicitud.monto_total ?? 0);

    const nuevoMontoPagado = montoPagadoActual + montoPagado;

    if (nuevoMontoPagado > montoTotal + 0.00001) {
      await conexion.rollback();
      return res.status(400).json({
        message: "El abono excede el monto total de la solicitud.",
      });
    }

    // 2) Insertar pago_realizado (abono)
    const [resultadoPago] = await conexion.execute(
      `
        INSERT INTO pagos_realizados
          (solicitud_pago_id, fecha_pago, metodo_pago, banco_id, referencia_pago, ruta_comprobante,
           monto_pagado, moneda, tasa_cambio, usuario_id)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        fechaPagoMySql,
        metodoPago,
        bancoId,
        referenciaPago,
        rutaComprobante,
        montoPagado,
        monedaFinal,
        tasaCambio,
        usuarioApruebaId,
      ]
    );

    const pagoRealizadoId = resultadoPago.insertId;

    // 3) Estado según saldo
    const estadoNuevo = nuevoMontoPagado >= montoTotal ? "pagada" : "parcial";

    // 4) Actualizar solicitud (aquí se guarda quién aprueba ✅)
    await conexion.execute(
      `
        UPDATE solicitudes_pago
        SET
          monto_pagado = ?,
          estado = ?,
          usuario_aprueba_id = ?,
          metodo_pago = ?,
          banco_id = ?,
          referencia_pago = ?,
          ruta_comprobante = ?,
          fecha_pago = COALESCE(?, fecha_pago),
          observaciones = COALESCE(?, observaciones)
        WHERE id = ?
      `,
      [
        nuevoMontoPagado,
        estadoNuevo,
        usuarioApruebaId,
        metodoPago,
        bancoId,
        referenciaPago,
        rutaComprobante,
        fechaPagoMySql,
        observaciones,
        id,
      ]
    );

    await conexion.commit();

    // 5) ✅ Generar y guardar PDF automáticamente en S3 (fuera de la transacción)
    //    Si esto falla, NO revienta el pago: solo no habrá PDF (pero lo logueamos).
    try {
      await guardarPdfOrdenPagoPorAbono({
        solicitudPagoId: Number(id),
        pagoRealizadoId: Number(pagoRealizadoId),
        usuarioId: Number(usuarioApruebaId),
        ip,
        userAgent,
      });
    } catch (errorPdf) {
      console.error(
        "⚠️ Pago registrado, pero falló la generación/guardado del PDF:",
        errorPdf
      );
    }

    return res.json({
      message: "Abono registrado correctamente.",
      solicitudPagoId: Number(id),
      pagoRealizadoId: Number(pagoRealizadoId),
      estado: estadoNuevo,
      montoPagadoTotal: nuevoMontoPagado,
    });
  } catch (error) {
    try {
      await conexion.rollback();
    } catch (_) {}
    console.error("Error pagarSolicitudPago:", error);
    return res
      .status(500)
      .json({ message: "Error interno al registrar el abono." });
  } finally {
    conexion.release();
  }
};

export const obtenerOrdenesPagoSolicitud = async (req, res) => {
  const solicitudPagoId = Number(req.params.id);

  try {
    if (!solicitudPagoId || Number.isNaN(solicitudPagoId)) {
      return res.status(400).json({ message: "ID de solicitud inválido." });
    }

    // 1) Validar que exista la solicitud
    const [[solicitud]] = await db.execute(
      `SELECT id, codigo, estado
       FROM solicitudes_pago
       WHERE id = ?
       LIMIT 1`,
      [solicitudPagoId]
    );

    if (!solicitud) {
      return res
        .status(404)
        .json({ message: "Solicitud de pago no encontrada." });
    }

    // 2) Traer los abonos (pagos_realizados) de esa solicitud
    const [pagos] = await db.execute(
      `SELECT
          pr.id,
          pr.solicitud_pago_id,
          pr.monto_pagado,
          pr.moneda,
          pr.tasa_cambio,
          pr.fecha_pago,
          pr.referencia_pago,
          pr.banco_id
       FROM pagos_realizados pr
       WHERE pr.solicitud_pago_id = ?
       ORDER BY pr.fecha_pago ASC, pr.id ASC`,
      [solicitudPagoId]
    );

    // 3) Por cada abono, buscar el PDF ordenPago en archivos
    //    (activo y con mayor numeroVersion)
    const ordenesPago = await Promise.all(
      pagos.map(async (pago, index) => {
        const pagoRealizadoId = Number(pago.id);
        const numeroAbono = index + 1;

        const [[archivoPdf]] = await db.execute(
          `SELECT
              a.id AS archivoId,
              a.rutaS3,
              a.numeroVersion,
              a.estado,
              a.nombreOriginal
           FROM archivos a
           WHERE a.registroTipo = 'comprobantesPagos'
             AND a.subTipoArchivo = 'ordenPago'
             AND a.registroId = ?
             AND a.estado = 'activo'
           ORDER BY a.numeroVersion DESC, a.id DESC
           LIMIT 1`,
          [pagoRealizadoId]
        );

        let urlPdf = null;
        if (archivoPdf?.rutaS3) {
          // 10 min de validez (ajusta si quieres)
          urlPdf = await generarUrlPrefirmadaLectura(archivoPdf.rutaS3, 600);
        }

        return {
          pagoRealizadoId,
          numeroAbono,
          fechaPago: pago.fecha_pago,
          monto: pago.monto_pagado,
          moneda: pago.moneda,
          tasaCambio: pago.tasa_cambio ?? null,
          referenciaPago: pago.referencia_pago ?? null,
          bancoId: pago.banco_id ?? null,

          // PDF orden de pago (si existe)
          tienePdf: Boolean(archivoPdf?.rutaS3),
          archivoId: archivoPdf?.archivoId ?? null,
          nombreArchivo: archivoPdf?.nombreOriginal ?? null,
          rutaS3: archivoPdf?.rutaS3 ?? null,
          numeroVersion: archivoPdf?.numeroVersion ?? null,
          urlPdf,
        };
      })
    );

    return res.json(ordenesPago);
  } catch (error) {
    console.error("Error obtenerOrdenesPagoSolicitud:", error);
    return res.status(500).json({
      message: "Error interno al obtener las órdenes de pago.",
    });
  }
};

async function guardarPdfOrdenPagoPorAbono({
  solicitudPagoId,
  pagoRealizadoId,
  usuarioId,
  ip,
  userAgent,
}) {
  let clavePdfOrdenPago = null;
  const conexion = await db.getConnection();

  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  try {
    await conexion.beginTransaction();

    // 1) Traer data completa + datos del abono (pago_realizado)
    const [[row]] = await conexion.execute(
      `
      SELECT
        sp.*,

        g.codigo              AS gasto_codigo,
        g.total               AS gasto_total,
        g.moneda              AS gasto_moneda,
        g.tasa_cambio         AS gasto_tasa_cambio,
        g.documento           AS gasto_documento,
        tg.nombre             AS tipo_gasto_nombre,

        p.nombre              AS proveedor_nombre,
        p.rif                 AS proveedor_rif,
        p.telefono            AS proveedor_telefono,
        p.email               AS proveedor_email,

        us.nombre             AS solicita_nombre,
        us.firma              AS solicita_firma,

        ur.nombre             AS revisa_nombre,
        ur.firma              AS revisa_firma,

        up.nombre             AS aprueba_nombre,
        up.firma              AS aprueba_firma,

        pr.id                 AS pago_realizado_id,
        pr.fecha_pago         AS pago_fecha_pago,
        pr.metodo_pago        AS pago_metodo_pago,
        pr.banco_id           AS pago_banco_id,
        pr.referencia_pago    AS pago_referencia_pago,
        pr.ruta_comprobante   AS pago_ruta_comprobante,
        pr.monto_pagado       AS pago_monto_pagado,
        pr.moneda             AS pago_moneda,
        pr.tasa_cambio        AS pago_tasa_cambio,

        bp.nombre             AS pago_banco_nombre

      FROM solicitudes_pago sp
      LEFT JOIN gastos g           ON g.id = sp.gasto_id
      LEFT JOIN tipos_gasto tg     ON tg.id = g.tipo_gasto_id
      LEFT JOIN proveedores p      ON p.id = sp.proveedor_id
      LEFT JOIN usuarios us        ON us.id = sp.usuario_solicita_id
      LEFT JOIN usuarios ur        ON ur.id = sp.usuario_revisa_id
      LEFT JOIN usuarios up        ON up.id = sp.usuario_aprueba_id
      LEFT JOIN pagos_realizados pr ON pr.id = ?
      LEFT JOIN bancos bp          ON bp.id = pr.banco_id
      WHERE sp.id = ?
      LIMIT 1
      `,
      [pagoRealizadoId, solicitudPagoId]
    );

    if (!row) {
      throw new Error(
        "No se encontró data para generar el PDF de la orden de pago."
      );
    }

    // 2) Firmas (si existen en S3)
    const firmaSolicita = await firmaToDataUrl(row.solicita_firma);
    const firmaRevisa = await firmaToDataUrl(row.revisa_firma);
    const firmaAprueba = await firmaToDataUrl(row.aprueba_firma);

    // 3) Logo local (como ya lo tienes en tu archivo)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rutaLogo = path.join(__dirname, "assets", "logo.png"); // ajusta si tu ruta es otra
    const logo = fs.existsSync(rutaLogo)
      ? `data:image/png;base64,${fs.readFileSync(rutaLogo).toString("base64")}`
      : null;

    // 4) URL del comprobante del abono (si existe)
    const comprobanteUrl = row.pago_ruta_comprobante
      ? await generarUrlPrefirmadaLectura(row.pago_ruta_comprobante, 600)
      : null;

    // 5) Diferencia
    const montoSolicitado = Number(row.monto_total ?? 0);
    const montoPagadoTotal = Number(row.monto_pagado ?? 0);
    const diferencia = Math.max(montoSolicitado - montoPagadoTotal, 0);

    // 6) Número de abono (conteo por solicitud hasta este pago)
    const [[conteo]] = await conexion.execute(
      `
        SELECT COUNT(*) AS numeroAbono
        FROM pagos_realizados
        WHERE solicitud_pago_id = ?
          AND id <= ?
      `,
      [solicitudPagoId, pagoRealizadoId]
    );
    const numeroAbono = Number(conteo?.numeroAbono ?? 1);

    // 7) ✅ Objeto "datos" en el formato que espera el template (flat)
    const datos = {
      codigo: row.codigo,
      fechaSolicitud: row.created_at,
      fechaPago: row.pago_fecha_pago ?? row.fecha_pago ?? null,

      solicitadoPor: row.solicita_nombre ?? "—",
      autorizadoPor: row.revisa_nombre ?? "—",
      aprobadoPor: row.aprueba_nombre ?? "—",

      firmaSolicita,
      firmaAutoriza: firmaRevisa,
      firmaAprueba,

      // ✅ Estos 3 son los que te están saliendo "—" en el PDF
      metodoPago: row.pago_metodo_pago ?? row.metodo_pago ?? "—",
      banco: row.pago_banco_nombre ?? "—",
      referencia: row.pago_referencia_pago ?? "—",
      comprobanteUrl,

      montoSolicitado,
      montoPagado: montoPagadoTotal,
      diferencia,

      moneda: row.pago_moneda ?? row.moneda ?? "USD",
      tasaCambio: row.pago_tasa_cambio ?? row.tasa_cambio ?? null,

      observaciones: row.observaciones ?? null,

      gasto: {
        codigo: row.gasto_codigo || "—",
        tipoGasto: row.tipo_gasto_nombre || "—",
        total: row.gasto_total || 0,
        moneda: row.gasto_moneda || "—",
        tasaCambio: row.gasto_tasa_cambio || null,
        documentoUrl: row.gasto_documento
          ? await generarUrlPrefirmadaLectura(row.gasto_documento, 600)
          : null,
      },

      proveedor: row.proveedor_nombre
        ? {
            nombre: row.proveedor_nombre,
            rif: row.proveedor_rif,
            telefono: row.proveedor_telefono,
            email: row.proveedor_email,
          }
        : null,

      createdAt: row.created_at,
      updatedAt: row.updated_at,
      logo,
    };

    // 8) HTML y PDF
    const html = generarHTMLOrdenPago(datos, "final");

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

    // 9) Ruta S3
    const fechaBase = row.pago_fecha_pago
      ? new Date(row.pago_fecha_pago)
      : new Date();
    const anio = fechaBase.getFullYear();
    const mesPalabra = meses[fechaBase.getMonth()];
    const timestamp = Date.now();

    const nombreOriginal = `ordenPago-${row.codigo}-abono-${String(
      numeroAbono
    ).padStart(4, "0")}-${pagoRealizadoId}-${timestamp}.pdf`;

    const tamanioBytes = pdfBuffer.length;
    const extension = "pdf";

    clavePdfOrdenPago = `comprobantes_pagos/${anio}/${mesPalabra}/${row.codigo}/ordenes_pago/${nombreOriginal}`;

    // 10) Subir a S3
    await subirBufferAS3({
      claveS3: clavePdfOrdenPago,
      buffer: pdfBuffer,
      contentType: "application/pdf",
    });

    // 11) Registrar en tu sistema de archivos/versionado (grupo + archivo)
    const grupoId = await obtenerOcrearGrupoComprobante({
      conexion,
      registroTipo: "comprobantesPagos",
      registroId: solicitudPagoId,
      subTipo: "ordenPago",
    });

    await conexion.execute(
      `
        INSERT INTO archivos
          (grupoId, nombreOriginal, extension, tamanioBytes, rutaS3, estado,
           creadoPor, ipCreacion, userAgentCreacion, numeroVersion)
        VALUES
          (?, ?, ?, ?, ?, 'activo', ?, ?, ?, 1)
      `,
      [
        grupoId,
        nombreOriginal,
        extension,
        tamanioBytes,
        clavePdfOrdenPago,
        usuarioId,
        ip,
        userAgent,
      ]
    );

    await conexion.commit();

    return {
      clavePdfOrdenPago,
      nombreOriginal,
      numeroAbono,
    };
  } catch (error) {
    try {
      await conexion.rollback();
    } catch (_) {}
    // Si se subió y luego falló BD, intenta limpiar S3 (opcional)
    if (clavePdfOrdenPago) {
      try {
        await borrarObjetoAS3(clavePdfOrdenPago);
      } catch (_) {}
    }
    throw error;
  } finally {
    conexion.release();
  }
}

