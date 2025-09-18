// controllers/solicitudesPago.controller.js
import db from "../config/database.js";
import { s3, generarUrlPrefirmadaLectura } from "../utils/s3.js";
import { obtenerOcrearGrupoComprobante } from "../utils/gruposArchivos.js";
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
    WHERE sp.id = ?`,
    [id]
  );

  if (!row) {
    return res.status(404).json({ message: "Solicitud de pago no encontrada" });
  }

  /* ---------- 2. Firmas → Base64 ---------- */
  const [firmaSolicita, firmaRevisa, firmaAprueba] = await Promise.all([
    firmaToDataUrl(row.solicita_firma),
    firmaToDataUrl(row.revisa_firma),
    firmaToDataUrl(row.aprueba_firma),
  ]);

  /* ---------- 3. Firmar URLs de comprobante y documento gasto ---------- */
  let comprobanteUrl = null;
  if (row.ruta_comprobante) {
    comprobanteUrl = await generarUrlPrefirmadaLectura(
      row.ruta_comprobante,
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

  /* ---------- 4. Calcular diferencia ---------- */
  const diferencia = (row.monto_total || 0) - (row.monto_pagado || 0);

  /* ---------- 5. Armar objeto para el template ---------- */
  const datos = {
    /* cabecera */
    codigo: row.codigo,
    fechaSolicitud: row.fecha_solicitud,
    fechaPago: row.fecha_pago,
    estado: row.estado,

    solicitadoPor: row.solicita_nombre,
    autorizadoPor: row.revisa_nombre,
    aprobadoPor: row.aprueba_nombre,

    firmaSolicita,
    firmaAutoriza: firmaRevisa,
    firmaAprueba,

    metodoPago: row.metodo_pago,
    banco: row.banco_nombre || "—",
    referencia: row.referencia_pago || "—",

    montoSolicitado: row.monto_total,
    montoPagado: row.monto_pagado,
    diferencia,
    moneda: row.moneda,
    tasaCambio: row.tasa_cambio,

    observaciones: row.observaciones,

    /* gasto asociado */
    gasto: {
      codigo: row.gasto_codigo || "—",
      tipoGasto: row.tipo_gasto_nombre || "—",
      total: row.gasto_total || 0,
      moneda: row.gasto_moneda || "—",
      tasaCambio: row.gasto_tasa_cambio || null,
      documentoUrl: gastoDocumentoUrl || null,
    },

    /* proveedor (si existe) */
    proveedor: row.proveedor_nombre
      ? {
          nombre: row.proveedor_nombre,
          rif: row.proveedor_rif,
          telefono: row.proveedor_telefono,
          email: row.proveedor_email,
        }
      : null,

    /* archivo comprobante pago */
    comprobanteUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const html = generarHTMLOrdenPago(datos, "final");

  /* ---------- 6. Puppeteer → PDF ---------- */
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

  /* ---------- 7. Enviar ---------- */
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
    /* ---------- 6. ARCHIVO (solo si hay) ---------- */
    if (rutaComprobante) {
      /* 6.1. Grupo */
      const grupoId = await obtenerOcrearGrupoComprobante(
        db,
        id,
        usuarioApruebaId
      );

      /* 6.2. Calcular Nº de versión */
      const [[{ maxVer }]] = await db.query(
        `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
       FROM archivos
      WHERE registroTipo = 'comprobantesPagos' AND registroId = ?`,
        [id]
      );
      const numeroVersion = maxVer + 1;

      /* 6.3. Tabla archivos */
      const [aRes] = await db.query(
        `INSERT INTO archivos
       (registroTipo, registroId, grupoArchivoId,
        nombreOriginal, extension, tamanioBytes,
        rutaS3, numeroVersion, estado,
        subidoPor, creadoEn, actualizadoEn)
     VALUES ('comprobantesPagos', ?, ?, ?, ?, ?, ?, ?, 'activo',
             ?, NOW(), NOW())`,
        [
          id,
          grupoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaComprobante,
          numeroVersion,
          usuarioApruebaId,
        ]
      );
      const archivoId = aRes.insertId;

      /* 6.4. versionesArchivo */
      const [vRes] = await db.query(
        `INSERT INTO versionesArchivo
       (archivoId, numeroVersion, nombreOriginal, extension,
        tamanioBytes, rutaS3, subidoPor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          archivoId,
          numeroVersion,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaComprobante,
          usuarioApruebaId,
        ]
      );
      const versionId = vRes.insertId;

      /* 6.5. eventosArchivo */
      await db.query(
        `INSERT INTO eventosArchivo
       (archivoId, versionId, accion, creadoPor,
        ip, userAgent, detalles)
     VALUES (?, ?, 'subidaArchivo', ?, ?, ?, ?)`,
        [
          archivoId,
          versionId,
          usuarioApruebaId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({ nombreOriginal, extension, ruta: rutaComprobante }),
        ]
      );

      /* 6.6. cuota de almacenamiento del aprobador */
      await db.query(
        `UPDATE usuarios
        SET usoStorageBytes = usoStorageBytes + ?
      WHERE id = ?`,
        [tamanioBytes, usuarioApruebaId]
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
