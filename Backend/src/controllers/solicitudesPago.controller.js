// controllers/solicitudesPago.controller.js
import db from "../config/database.js";
import { s3, generarUrlPrefirmadaLectura } from "../utils/s3.js";
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

  /* ---------- 3. Logo local → Base64 ---------- */
  let logo = null;
  try {
    const archivoActual = fileURLToPath(import.meta.url);
    const carpetaActual = path.dirname(archivoActual);
    // estamos en Backend/src/controllers → subir a Backend y entrar a styles
    const rutaLogo = path.join(
      carpetaActual,
      "..",
      "..",
      "styles",
      "Logo Operaciones Logisticas Falcon.jpg"
    );
    const bufferLogo = fs.readFileSync(rutaLogo);
    const base64Logo = bufferLogo.toString("base64");
    logo = `data:image/jpeg;base64,${base64Logo}`;
  } catch (err) {
    console.error("No se pudo cargar el logo de Orden de Pago:", err);
  }

  /* ---------- 4. Firmar URLs de comprobante y documento gasto ---------- */
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

  /* ---------- 5. Calcular diferencia ---------- */
  const diferencia = (row.monto_total || 0) - (row.monto_pagado || 0);

  /* ---------- 6. Armar objeto para el template ---------- */
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

    /* 🔹 Logo en base64 para el template */
    logo,
  };

  const html = generarHTMLOrdenPago(datos, "final");

  /* ---------- 7. Puppeteer → PDF ---------- */
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

  /* ---------- 8. Enviar ---------- */
  res
    .set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=orden_pago_${
        row.codigo || "SIN_CODIGO"
      }.pdf`,
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


export const pagarSolicitudPago = async (req, res) => {
  const { id } = req.params;

  // 🔹 Datos que vienen del frontend (body en snake_case)
  let {
    metodo_pago,
    banco_id: rawBancoId,
    referencia_pago,
    observaciones,
    fecha_pago,
    monto_abono, // monto del abono en la MONEDA de la solicitud
    tasa_cambio_abono, // tasa del día (solo si moneda = VES)
  } = req.body;

  /* ---------- 1. VALIDACIONES POR TIPO DE PAGO ---------- */
  if (!metodo_pago) {
    return res.status(400).json({ message: "Método de pago requerido" });
  }

  const metodoNormalizado = metodo_pago.trim().toLowerCase();

  if (metodoNormalizado === "efectivo") {
    rawBancoId = null;
    referencia_pago = null;
  } else {
    if (!rawBancoId) {
      return res.status(400).json({ message: "Banco requerido" });
    }
    if (!referencia_pago) {
      return res.status(400).json({ message: "Referencia de pago requerida" });
    }
    if (!req.file) {
      return res.status(400).json({
        message: "Comprobante (PDF o imagen) requerido",
      });
    }
  }

  /* ---------- 2. VALIDAR MONTO DEL ABONO ---------- */
  const montoAbono = parseFloat(monto_abono);
  if (isNaN(montoAbono) || montoAbono <= 0) {
    return res.status(400).json({
      message: "monto_abono es requerido y debe ser mayor a 0",
    });
  }

  /* ---------- 3. DATOS DEL COMPROBANTE / USUARIO ---------- */
  const bancoId = metodoNormalizado === "efectivo" ? null : rawBancoId;
  const comprobanteFile = req.file || null;
  const rutaComprobante = comprobanteFile ? comprobanteFile.key : null;
  const nombreOriginal = comprobanteFile ? comprobanteFile.originalname : null;
  const extension = nombreOriginal ? nombreOriginal.split(".").pop() : null;
  const tamanioBytes = comprobanteFile ? comprobanteFile.size : null;
  const fechaPagoFinal = fecha_pago ? new Date(fecha_pago) : new Date();
  const usuarioApruebaId = req.user?.id;

  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    /* ---------- 4. OBTENER SOLICITUD Y VALIDAR ESTADO ---------- */
    const [[sol]] = await conexion.execute(
      `
      SELECT 
        id,
        estado,
        monto_total,
        monto_pagado,
        monto_total_usd,
        moneda,
        tasa_cambio
      FROM solicitudes_pago
      WHERE id = ?
      `,
      [id]
    );

    if (!sol) {
      await conexion.rollback();
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    // Solo permitimos abonos si NO está ya pagada
    if (!["por_pagar", "parcialmente_pagada"].includes(sol.estado)) {
      await conexion.rollback();
      return res.status(400).json({
        message: `No se puede registrar abono; estado actual: ${sol.estado}`,
      });
    }

    const montoTotalMoneda = parseFloat(sol.monto_total) || 0;
    const montoPagadoMonedaActual = parseFloat(sol.monto_pagado) || 0;
    const saldoMonedaActual = montoTotalMoneda - montoPagadoMonedaActual;

    if (montoAbono > saldoMonedaActual + 0.0001) {
      await conexion.rollback();
      return res.status(400).json({
        message:
          "El monto del abono no puede ser mayor al saldo pendiente en la solicitud.",
      });
    }

    /* ---------- 5. DEFINIR TASA DE CAMBIO DEL ABONO ---------- */
    let tasaCambioAbonoFinal = null;

    if (sol.moneda === "VES") {
      const tasaNum = parseFloat(tasa_cambio_abono);
      if (isNaN(tasaNum) || tasaNum <= 0) {
        await conexion.rollback();
        return res.status(400).json({
          message:
            "tasa_cambio_abono es requerida y debe ser mayor a 0 cuando la moneda es VES.",
        });
      }
      tasaCambioAbonoFinal = tasaNum;
    } else {
      // Solicitud en USD → no necesitamos tasa para el abono
      tasaCambioAbonoFinal = null;
    }

    /* ---------- 6. INSERTAR ABONO EN pagos_realizados ---------- */
    const [insertPago] = await conexion.execute(
      `
      INSERT INTO pagos_realizados (
        solicitud_pago_id,
        usuario_id,
        metodo_pago,
        banco_id,
        referencia_pago,
        ruta_comprobante,
        observaciones,
        fecha_pago,
        monto_pagado,
        moneda,
        tasa_cambio
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        usuarioApruebaId,
        metodo_pago,
        bancoId,
        referencia_pago,
        rutaComprobante,
        observaciones || null,
        fechaPagoFinal,
        montoAbono,
        sol.moneda,
        tasaCambioAbonoFinal,
      ]
    );

    const pagoRealizadoId = insertPago.insertId;

    /* ---------- 7. SUMAR PAGOS EN USD PARA LA SOLICITUD ---------- */
    const [[sumas]] = await conexion.execute(
      `
      SELECT 
        IFNULL(SUM(monto_pagado_usd), 0) AS total_pagado_usd
      FROM pagos_realizados
      WHERE solicitud_pago_id = ?
      `,
      [id]
    );

    const totalPagadoUsd = parseFloat(sumas.total_pagado_usd) || 0;
    const montoTotalUsd = parseFloat(sol.monto_total_usd) || 0;

    /* ---------- 8. DETERMINAR NUEVO ESTADO ---------- */
    let nuevoEstado = "por_pagar";

    if (totalPagadoUsd > 0 && totalPagadoUsd < montoTotalUsd) {
      nuevoEstado = "parcialmente_pagada";
    } else if (montoTotalUsd > 0 && totalPagadoUsd >= montoTotalUsd) {
      nuevoEstado = "pagada";
    }

    /* ---------- 9. CALCULAR monto_pagado EN MONEDA ORIGINAL ---------- */
    let nuevoMontoPagadoMoneda = 0;

    if (sol.moneda === "USD") {
      nuevoMontoPagadoMoneda = totalPagadoUsd;
    } else if (sol.moneda === "VES") {
      const tasaSolicitud = parseFloat(sol.tasa_cambio) || 0;
      if (tasaSolicitud > 0 && totalPagadoUsd > 0) {
        nuevoMontoPagadoMoneda = totalPagadoUsd * tasaSolicitud;
      } else {
        // respaldo: sumamos lo que ya tenía + el abono
        nuevoMontoPagadoMoneda = montoPagadoMonedaActual + montoAbono;
      }
    }

    /* ---------- 10. ACTUALIZAR CABECERA DE LA SOLICITUD ---------- */
    await conexion.execute(
      `
      UPDATE solicitudes_pago
      SET 
        banco_id         = ?,
        metodo_pago      = ?,
        referencia_pago  = ?,
        ruta_comprobante = ?,
        observaciones    = ?,
        fecha_pago       = CASE
                             WHEN ? >= monto_total_usd AND monto_total_usd > 0
                               THEN ?
                             ELSE fecha_pago
                           END,
        usuario_aprueba_id = ?,
        estado           = ?,
        monto_pagado     = ?
      WHERE id = ?
      `,
      [
        bancoId,
        metodo_pago,
        referencia_pago,
        rutaComprobante,
        observaciones || null,
        totalPagadoUsd,
        fechaPagoFinal,
        usuarioApruebaId,
        nuevoEstado,
        nuevoMontoPagadoMoneda,
        id,
      ]
    );

    /* ---------- 11. REGISTRO EN archivos (SI HAY COMPROBANTE) ---------- */
    if (rutaComprobante) {
      // 11.1 Grupo de comprobantes para esta solicitud
      const grupoId = await obtenerOcrearGrupoComprobante(
        db, // usa el pool general para la parte de archivos
        id,
        usuarioApruebaId
      );

      // 11.2 Determinar número de versión
      const [[{ maxVer }]] = await db.query(
        `
        SELECT IFNULL(MAX(numeroVersion), 0) AS maxVer
        FROM archivos
        WHERE registroTipo = 'comprobantesPagos'
          AND registroId   = ?
        `,
        [id]
      );
      const numeroVersion = maxVer + 1;

      // 11.3 Insertar en archivos
      const [aRes] = await db.query(
        `
        INSERT INTO archivos
          (registroTipo, registroId, grupoArchivoId,
           nombreOriginal, extension, tamanioBytes,
           rutaS3, numeroVersion, estado,
           subidoPor, creadoEn, actualizadoEn)
        VALUES
          ('comprobantesPagos', ?, ?, ?, ?, ?, ?, ?, 'activo',
           ?, NOW(), NOW())
        `,
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

      // 11.4 Insertar versión
      const [vRes] = await db.query(
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
          rutaComprobante,
          usuarioApruebaId,
        ]
      );
      const versionId = vRes.insertId;

      // 11.5 Evento de archivo
      await db.query(
        `
        INSERT INTO eventosArchivo
          (archivoId, versionId, accion, creadoPor,
           ip, userAgent, detalles)
        VALUES
          (?, ?, 'subidaArchivo', ?, ?, ?, ?)
        `,
        [
          archivoId,
          versionId,
          usuarioApruebaId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            nombreOriginal,
            extension,
            ruta: rutaComprobante,
            pagoRealizadoId,
          }),
        ]
      );

      // 11.6 Actualizar uso de storage del usuario
      await db.query(
        `
        UPDATE usuarios
        SET usoStorageBytes = usoStorageBytes + ?
        WHERE id = ?
        `,
        [tamanioBytes, usuarioApruebaId]
      );
    }

    await conexion.commit();

    return res.json({
      message: "Abono registrado correctamente.",
      solicitud_id: id,
      pago_realizado_id: pagoRealizadoId,
      nuevo_estado: nuevoEstado,
    });
  } catch (error) {
    console.error("Error al registrar abono:", error);
    await conexion.rollback();
    return res
      .status(500)
      .json({ message: "Error interno al registrar el abono." });
  } finally {
    conexion.release();
  }
};
