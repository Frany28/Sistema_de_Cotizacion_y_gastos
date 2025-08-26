// src/controllers/eventosArchivos.controller.js
import db from "../config/database.js";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generarHTMLEventosArchivos } from "../../templates/generarHTMLEventosArchivos.js";

import PDFDocument from "pdfkit";

export const rolAdmin = 1;
export const rolSupervisor = 2;
export const rolEmpleado = 3;

/* Util: validación y sanitización simple */
const toPosInt = (v, def) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : def;
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/* =====  A) MÉTRICAS DEL TABLERO  ===== */

// A) MÉTRICAS DEL TABLERO
export const obtenerMetricasTablero = async (req, res) => {
  const { registroTipo } = req.query;

  const fechaInicio = new Date();
  fechaInicio.setDate(1);
  fechaInicio.setHours(0, 0, 0, 0);

  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  // ✅ usar cadena vacía, no []
  const filtroTipoSql = registroTipo ? "AND a.registroTipo = ?" : "";
  const paramsTipo = registroTipo ? [registroTipo] : [];

  try {
    const [[mActivos]] = await db.query(
      `SELECT COUNT(*) AS totalArchivosActivos
         FROM archivos a
        WHERE a.estado = 'activo' ${filtroTipoSql}`,
      paramsTipo
    );

    const [[mEventos]] = await db.query(
      `SELECT COUNT(*) AS totalEventosMes
         FROM eventosArchivo e
        WHERE e.fechaHora >= ? AND e.fechaHora < ?`,
      [fechaInicio, fechaFin]
    );

    // ✅ corregir params (eliminar ".")
    const [[mVersiones]] = await db.query(
      `SELECT COUNT(*) AS totalVersionesMes
         FROM versionesArchivo v
         JOIN archivos a ON a.id = v.archivoId
        WHERE v.creadoEn >= ? AND v.creadoEn < ?
              ${filtroTipoSql}`,
      [fechaInicio, fechaFin, ...paramsTipo]
    );

    const [[mAlmacen]] = await db.query(
      `SELECT COALESCE(SUM(a.tamanioBytes),0) AS totalAlmacenamientoBytes
         FROM archivos a
        WHERE 1=1 ${filtroTipoSql}`,
      paramsTipo
    );

    return res.json({
      totalArchivosActivos: mActivos.totalArchivosActivos,
      totalEventosMes: mEventos.totalEventosMes,
      totalVersionesMes: mVersiones.totalVersionesMes,
      totalAlmacenamientoBytes: mAlmacen.totalAlmacenamientoBytes,
    });
  } catch (error) {
    console.error("Error en obtenerMetricasTablero:", error);
    return res.status(500).json({ mensaje: "Error al obtener métricas" });
  }
};

// Reemplazo de la función en src/controllers/eventosArchivos.controller.js
export const obtenerTendenciaActividad = async (req, res) => {
  // dias: por defecto 30, mínimo 7 y máximo 180 (igual que antes)
  const dias = Math.max(7, Math.min(180, Number(req.query.dias ?? 30)));
  const { registroTipo, accion } = req.query;

  // Rango de fechas (diario, truncando a 00:00)
  const fechaFin = new Date();
  fechaFin.setHours(0, 0, 0, 0);
  const fechaInicio = new Date(fechaFin);
  fechaInicio.setDate(fechaFin.getDate() - (dias - 1));

  try {
    // 1) Normalizamos acciones en una subconsulta para unificar histórico:
    //    'subida' | 'subidaArchivo'           → 'subidaArchivo'
    //    'eliminacion' | 'eliminacionArchivo' → 'eliminacionArchivo'
    //    'sustitucion' | 'sustitucionArchivo' → 'sustitucionArchivo'
    //    'borradoDefinitivo'                  → 'borradoDefinitivo'
    //
    //    Nota: descartamos acciones vacías.
    const params = [fechaInicio, fechaFin];
    const filtrosEv = [];
    const filtrosJoinArch = [];

    if (accion) {
      // Filtramos por la acción ya normalizada
      filtrosEv.push(`ev.accionNorm = ?`);
      params.push(accion);
    } else {
      filtrosEv.push(`ev.accionNorm <> ''`);
    }

    if (registroTipo) {
      filtrosJoinArch.push(`a.registroTipo = ?`);
      params.push(registroTipo);
    }

    const whereEv = filtrosEv.length ? `WHERE ${filtrosEv.join(" AND ")}` : "";
    const andJoinArch = filtrosJoinArch.length
      ? `AND ${filtrosJoinArch.join(" AND ")}`
      : "";

    const [rows] = await db.query(
      `
      WITH RECURSIVE fechas AS (
        SELECT DATE(?) AS f
        UNION ALL
        SELECT DATE_ADD(f, INTERVAL 1 DAY) FROM fechas
        WHERE f < DATE(?)
      ),
      eventosNorm AS (
        SELECT
          DATE(e.fechaHora)     AS fechaDia,
          CASE
            WHEN e.accion IN ('subida','subidaArchivo')                 THEN 'subidaArchivo'
            WHEN e.accion IN ('eliminacion','eliminacionArchivo')       THEN 'eliminacionArchivo'
            WHEN e.accion IN ('sustitucion','sustitucionArchivo')       THEN 'sustitucionArchivo'
            WHEN e.accion = 'borradoDefinitivo'                         THEN 'borradoDefinitivo'
            ELSE ''
          END                      AS accionNorm,
          e.archivoId
        FROM eventosArchivo e
        WHERE e.fechaHora >= ? AND e.fechaHora < ?
      ),
      ev AS (
        SELECT en.*, a.registroTipo
        FROM eventosNorm en
        JOIN archivos a ON a.id = en.archivoId
        WHERE 1=1 ${andJoinArch}
      )
      SELECT
        f.f AS fecha,
        SUM(CASE WHEN ev.accionNorm = 'subidaArchivo'       THEN 1 ELSE 0 END) AS subidas,
        SUM(CASE WHEN ev.accionNorm = 'eliminacionArchivo'  THEN 1 ELSE 0 END) AS eliminaciones,
        SUM(CASE WHEN ev.accionNorm = 'sustitucionArchivo'  THEN 1 ELSE 0 END) AS sustituciones,
        SUM(CASE WHEN ev.accionNorm = 'borradoDefinitivo'   THEN 1 ELSE 0 END) AS borradosDefinitivos
      FROM fechas f
      LEFT JOIN ev ON ev.fechaDia = f.f
      ${whereEv ? whereEv.replaceAll("ev.", "ev.") : ""}
      GROUP BY f.f
      ORDER BY f.f ASC
      `,
      [fechaInicio, fechaFin, fechaInicio, fechaFin, ...params.slice(2)]
    );

    return res.json({ desde: fechaInicio, hasta: fechaFin, dias, serie: rows });
  } catch (error) {
    console.error("Error en obtenerTendenciaActividad:", error);
    return res.status(500).json({ mensaje: "Error al obtener tendencia" });
  }
};

/* =====  B) FEED DE ACTIVIDAD  ===== */

// B) FEED DE ACTIVIDAD — Enum estricto y tiposDisponibles/total
export const listarActividadReciente = async (req, res) => {
  const creadoPorUsuario = req.user.id;
  const rolId = req.user.rol_id;
  const esVistaCompleta = rolId === 1 || rolId === 2; // admin o supervisor

  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 10)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const { q, accion, registroTipo, desde, hasta } = req.query;

  const filtros = [];
  const params = [];

  // Rango de fechas (opcional)
  if (desde) {
    filtros.push("en.fechaHora >= ?");
    params.push(new Date(`${desde}T00:00:00`));
  }
  if (hasta) {
    filtros.push("en.fechaHora < ?");
    params.push(new Date(`${hasta}T23:59:59`));
  }

  // Filtro por acción (sobre acción normalizada al ENUM oficial)
  if (accion) {
    filtros.push("en.accionNorm = ?");
    params.push(accion);
  } else {
    filtros.push("en.accionNorm <> ''");
  }

  // Filtro por tipo de registro (opcional)
  if (registroTipo) {
    filtros.push("a.registroTipo = ?");
    params.push(registroTipo);
  }

  // Búsqueda por nombre de archivo (opcional)
  if (q) {
    filtros.push("a.nombreOriginal LIKE ?");
    params.push(`%${q}%`);
  }

  // Visibilidad para empleados
  if (!esVistaCompleta) {
    filtros.push("(a.subidoPor = ? OR en.creadoPor = ?)");
    params.push(creadoPorUsuario, creadoPorUsuario);
  }

  const whereSql = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

  try {
    // Normalizamos a los 4 valores del ENUM
    const baseSql = `
      WITH eventosNorm AS (
        SELECT
          e.id,
          e.fechaHora,
          e.creadoPor,
          e.archivoId,
          CASE
            WHEN e.accion IN ('subida','subidaArchivo')                 THEN 'subidaArchivo'
            WHEN e.accion IN ('eliminacion','eliminacionArchivo')       THEN 'eliminacionArchivo'
            WHEN e.accion IN ('sustitucion','sustitucionArchivo')       THEN 'sustitucionArchivo'
            WHEN e.accion = 'borradoDefinitivo'                         THEN 'borradoDefinitivo'
            ELSE ''
          END AS accionNorm
        FROM eventosArchivo e
      )
      SELECT
        en.id             AS eventoId,
        en.fechaHora      AS fechaEvento,
        en.accionNorm     AS tipoEvento,
        en.creadoPor      AS usuarioId,
        u.nombre          AS usuarioNombre,
        a.id              AS archivoId,
        a.nombreOriginal  AS nombreArchivo,
        a.extension       AS extension,
        a.tamanioBytes    AS tamanioBytes,
        a.registroTipo    AS registroTipo,
        a.registroId      AS registroId
      FROM eventosNorm en
      JOIN archivos a      ON a.id = en.archivoId
      LEFT JOIN usuarios u ON u.id = en.creadoPor
      ${whereSql}
    `;

    // total para paginación
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM (${baseSql}) AS t`,
      params
    );

    // tiposDisponibles (DISTINCT), solo de los 4 oficiales
    const [tiposRows] = await db.query(
      `SELECT DISTINCT tipoEvento FROM (${baseSql}) AS t
       WHERE tipoEvento IN ('subidaArchivo','eliminacionArchivo','sustitucionArchivo','borradoDefinitivo')
       ORDER BY tipoEvento ASC`,
      params
    );
    const tiposDisponibles = tiposRows.map((r) => r.tipoEvento);

    // página de eventos
    const [eventos] = await db.query(
      `${baseSql}
       ORDER BY fechaEvento DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      eventos,
      limit,
      offset,
      total,
      tiposDisponibles,
    });
  } catch (error) {
    console.error("Error en listarActividadReciente:", error);
    return res.status(500).json({ mensaje: "Error al listar eventos" });
  }
};

// D) VERSIONES DEL MES (ahora desde versionesArchivo)
export const contarVersionesDelMesPorArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);

  const fechaInicio = new Date();
  fechaInicio.setDate(1);
  fechaInicio.setHours(0, 0, 0, 0);

  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  try {
    const [[existe]] = await db.query(`SELECT id FROM archivos WHERE id = ?`, [
      archivoId,
    ]);
    if (!existe) {
      return res.status(404).json({ mensaje: "Archivo no encontrado" });
    }

    //  cuenta en versionesArchivo por archivoId
    const [[fila]] = await db.query(
      `SELECT COUNT(*) AS totalDelMes
         FROM versionesArchivo
        WHERE archivoId = ?
          AND creadoEn >= ? AND creadoEn < ?`,
      [archivoId, fechaInicio, fechaFin]
    );

    return res.json({ totalDelMes: fila.totalDelMes });
  } catch (error) {
    console.error("Error al contar versiones del mes:", error);
    return res
      .status(500)
      .json({ mensaje: "Error al contar versiones del mes" });
  }
};

export const obtenerAlmacenamientoTotalPorDocumento = async (req, res) => {
  const archivoId = req.params.id;
  try {
    const [[base]] = await db.query(
      `SELECT registroTipo, registroId
         FROM archivos
        WHERE id = ?`,
      [archivoId]
    );
    if (!base)
      return res.status(404).json({ mensaje: "Archivo no encontrado" });

    const [[suma]] = await db.query(
      `SELECT COALESCE(SUM(tamanioBytes),0) AS totalBytes
         FROM archivos
        WHERE registroTipo = ? AND registroId = ?`,
      [base.registroTipo, base.registroId]
    );

    return res.json({ totalBytes: suma.totalBytes });
  } catch (error) {
    console.error("Error al calcular almacenamiento total:", error);
    return res
      .status(500)
      .json({ mensaje: "Error al calcular almacenamiento total" });
  }
};

// === NUEVO: CONTADORES PARA TARJETAS (mes actual por defecto) ===
export const obtenerContadoresTarjetas = async (req, res) => {
  try {
    const { desde, hasta, registroTipo } = req.query;

    // Rango por defecto: mes en curso (incluye hora inicio y fin)
    const fechaInicio = desde
      ? new Date(`${desde}T00:00:00`)
      : (() => {
          const f = new Date();
          f.setDate(1);
          f.setHours(0, 0, 0, 0);
          return f;
        })();

    const fechaFin = hasta
      ? new Date(`${hasta}T23:59:59`)
      : (() => {
          const f = new Date(fechaInicio);
          f.setMonth(f.getMonth() + 1);
          return f;
        })();

    // Filtro opcional por tipo de registro (firmas, facturasGastos, etc.)
    const filtroTipoSql = registroTipo ? "AND a.registroTipo = ?" : "";
    const paramsTipo = registroTipo ? [registroTipo] : [];

    // 1) Total de archivos activos hoy (no cuenta reemplazados/eliminados/borrados)
    const [[mActivos]] = await db.query(
      `SELECT COUNT(*) AS totalArchivosActivos
         FROM archivos a
        WHERE a.estado = 'activo' ${filtroTipoSql}`,
      paramsTipo
    );

    // 2) Acciones por periodo (excluye acciones vacías)
    const baseParams = [fechaInicio, fechaFin, ...paramsTipo];

    const [[mSubidos]] = await db.query(
      `SELECT COUNT(*) AS totalSubidos
         FROM eventosArchivo e
         JOIN archivos a ON a.id = e.archivoId
        WHERE e.fechaHora >= ? AND e.fechaHora < ?
          AND e.accion = 'subidaArchivo' ${filtroTipoSql}`,
      baseParams
    );

    const [[mEliminados]] = await db.query(
      `SELECT COUNT(*) AS totalEliminados
         FROM eventosArchivo e
         JOIN archivos a ON a.id = e.archivoId
        WHERE e.fechaHora >= ? AND e.fechaHora < ?
         AND e.accion = 'eliminacionArchivo'  ${filtroTipoSql}`,
      baseParams
    );

    const [[mReemplazados]] = await db.query(
      `SELECT COUNT(*) AS totalReemplazados
         FROM eventosArchivo e
         JOIN archivos a ON a.id = e.archivoId
        WHERE e.fechaHora >= ? AND e.fechaHora < ?
          AND e.accion = 'sustitucionArchivo'  ${filtroTipoSql}`,
      baseParams
    );

    return res.json({
      totalArchivosActivos: mActivos.totalArchivosActivos,
      totalSubidos: mSubidos.totalSubidos,
      totalEliminados: mEliminados.totalEliminados,
      totalReemplazados: mReemplazados.totalReemplazados,
      desde: fechaInicio,
      hasta: fechaFin,
      registroTipo: registroTipo ?? null,
    });
  } catch (error) {
    console.error("Error en obtenerContadoresTarjetas:", error);
    return res.status(500).json({ mensaje: "Error al obtener contadores" });
  }
};

function construirRangoFechas({
  tipoReporte,
  mes,
  anio,
  fechaInicio,
  fechaFin,
}) {
  const ahora = new Date();

  if (tipoReporte === "mensual") {
    const m = Number(mes),
      y = Number(anio || ahora.getFullYear());
    const fIni = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const fFin = new Date(y, m, 1, 0, 0, 0, 0);
    return {
      fIni,
      fFin,
      etiqueta: `Mensual ${String(m).padStart(2, "0")}/${y}`,
    };
  }

  if (tipoReporte === "anual") {
    const y = Number(anio || ahora.getFullYear());
    const fIni = new Date(y, 0, 1, 0, 0, 0, 0);
    const fFin = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return { fIni, fFin, etiqueta: `Anual ${y}` };
  }

  // rango
  const fIni = new Date(`${fechaInicio}T00:00:00`);
  const fFin = new Date(`${fechaFin}T23:59:59`);
  return { fIni, fFin, etiqueta: `Rango ${fechaInicio} → ${fechaFin}` };
}

export async function generarReporteEventosPdf(req, res) {
  try {
    const {
      tipoReporte = "mensual",
      mes,
      anio,
      fechaInicio,
      fechaFin,
      registroTipo,
    } = req.query;
    if (!["mensual", "anual", "rango"].includes(tipoReporte)) {
      return res.status(400).json({ mensaje: "tipoReporte inválido" });
    }
    if (tipoReporte === "mensual" && !mes) {
      return res.status(400).json({ mensaje: "Falta mes (1-12)" });
    }
    if (tipoReporte === "rango" && (!fechaInicio || !fechaFin)) {
      return res
        .status(400)
        .json({ mensaje: "Debe enviar fechaInicio y fechaFin" });
    }

    const { fIni, fFin, etiqueta } = construirRangoFechas({
      tipoReporte,
      mes,
      anio,
      fechaInicio,
      fechaFin,
    });

    // Filtro opcional por tipo de registro (ej. firmas, facturas_gastos…)
    const filtroTipoSql = registroTipo ? "AND a.registroTipo = ?" : "";
    const paramsTipo = registroTipo ? [registroTipo] : [];

    // 1) Totales por acción en el período
    const [totRows] = await db.query(
      `
      SELECT
        SUM(e.accion='subidaArchivo')            AS totalSubidos,
        SUM(e.accion='eliminacionArchivo')       AS totalEliminados,
        SUM(e.accion='sustitucionArchivo')       AS totalReemplazados,
        SUM(e.accion='borradoDefinitivo')        AS totalBorradosDefinitivos
      FROM eventosArchivo e
      JOIN archivos a ON a.id = e.archivoId
      WHERE e.fechaHora >= ? AND e.fechaHora < ?
      ${filtroTipoSql}
      `,
      [fIni, fFin, ...paramsTipo]
    );

    const totales = totRows?.[0] || {
      totalSubidos: 0,
      totalEliminados: 0,
      totalReemplazados: 0,
      totalBorradosDefinitivos: 0,
    };

    // 2) Listado detallado (últimos 500 para no hacer PDFs gigantes)
    const [detalle] = await db.query(
      `
      SELECT
        e.id                AS eventoId,
        e.fechaHora         AS fechaEvento,
        e.accion            AS accion,
        e.creadoPor         AS usuarioId,
        a.id                AS archivoId,
        a.nombreOriginal    AS nombreArchivo,
        a.extension         AS extension,
        a.registroTipo      AS registroTipo,
        a.registroId        AS registroId
      FROM eventosArchivo e
      JOIN archivos a ON a.id = e.archivoId
      WHERE e.fechaHora >= ? AND e.fechaHora < ?
      ${filtroTipoSql}
      ORDER BY e.fechaHora DESC
      LIMIT 500
      `,
      [fIni, fFin, ...paramsTipo]
    );

    // 3) Generar PDF en streaming
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="reporte-eventos-${tipoReporte}.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 36 });
    doc.pipe(res);

    // Encabezado
    doc
      .fontSize(16)
      .fillColor("#111")
      .text("Reporte de Eventos de Archivos", { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#444").text(`Período: ${etiqueta}`);
    if (registroTipo) doc.text(`Filtro registroTipo: ${registroTipo}`);
    doc.moveDown(0.8);
    doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor("#999").stroke();
    doc.moveDown(0.8);

    // Tarjetas de totales
    const toNum = (v) => Number(v || 0);
    const totalesL = [
      ["Subidos", toNum(totales.totalSubidos)],
      ["Eliminados", toNum(totales.totalEliminados)],
      ["Reemplazados", toNum(totales.totalReemplazados)],
      ["Borrados definitivos", toNum(totales.totalBorradosDefinitivos)],
    ];

    doc.fontSize(12).fillColor("#111").text("Resumen", { underline: false });
    doc.moveDown(0.4);
    totalesL.forEach(([label, val]) => {
      doc.fontSize(10).fillColor("#333").text(`${label}: ${val}`);
    });

    doc.moveDown(0.8);
    doc
      .fontSize(12)
      .fillColor("#111")
      .text("Detalle de eventos (máx. 500)", { underline: false });
    doc.moveDown(0.3);

    // Cabecera tabla
    const cols = [120, 90, 120, 190]; // anchos
    const headers = ["Fecha", "Acción", "Archivo (ext.)", "TipoRegistro#Id"];
    const xBase = doc.x,
      yStart = doc.y;

    doc.fontSize(9).fillColor("#666");
    headers.forEach((h, i) => {
      doc.text(h, xBase + cols.slice(0, i).reduce((a, b) => a + b, 0), yStart, {
        width: cols[i],
      });
    });
    doc.moveDown(0.2);
    doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor("#ddd").stroke();

    // Filas
    doc.fontSize(9).fillColor("#111");
    detalle.forEach((r) => {
      const fila = [
        new Date(r.fechaEvento).toLocaleString(),
        r.accion,
        `${r.nombreArchivo || "-"} (${r.extension || "-"})`,
        `${r.registroTipo || "-"} #${r.registroId ?? "-"}`,
      ];
      const yFila = doc.y + 2;
      fila.forEach((txt, i) => {
        doc.text(
          String(txt),
          xBase + cols.slice(0, i).reduce((a, b) => a + b, 0),
          yFila,
          {
            width: cols[i],
            ellipsis: true,
          }
        );
      });
      doc.moveDown(0.6);
      if (doc.y > 760) doc.addPage();
    });

    doc.end();
  } catch (err) {
    console.error("Error al generar PDF:", err);
    res.status(500).json({ mensaje: "No fue posible generar el PDF" });
  }
}

function construirRangoFechas({
  tipoReporte,
  mes,
  anio,
  fechaInicio,
  fechaFin,
}) {
  const ahora = new Date();

  if (tipoReporte === "mensual") {
    const m = Number(mes);
    const y = Number(anio || ahora.getFullYear());
    const fIni = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const fFin = new Date(y, m, 1, 0, 0, 0, 0);
    return {
      fIni,
      fFin,
      periodoLabel: `Mensual ${String(m).padStart(2, "0")}/${y}`,
      fechaInicioTexto: fIni.toLocaleDateString("es-VE"),
      fechaFinTexto: new Date(fFin - 1).toLocaleDateString("es-VE"),
    };
  }

  if (tipoReporte === "anual") {
    const y = Number(anio || ahora.getFullYear());
    const fIni = new Date(y, 0, 1, 0, 0, 0, 0);
    const fFin = new Date(y + 1, 0, 1, 0, 0, 0, 0);
    return {
      fIni,
      fFin,
      periodoLabel: `Anual ${y}`,
      fechaInicioTexto: fIni.toLocaleDateString("es-VE"),
      fechaFinTexto: new Date(fFin - 1).toLocaleDateString("es-VE"),
    };
  }

  // rango libre
  const fIni = new Date(`${fechaInicio}T00:00:00`);
  const fFin = new Date(`${fechaFin}T23:59:59`);
  return {
    fIni,
    fFin,
    periodoLabel: `Rango ${fechaInicio} → ${fechaFin}`,
    fechaInicioTexto: fIni.toLocaleDateString("es-VE"),
    fechaFinTexto: fFin.toLocaleDateString("es-VE"),
  };
}

export const generarPdfMovimientosArchivos = async (req, res) => {
  try {
    const {
      tipoReporte = "mensual",
      mes,
      anio,
      fechaInicio,
      fechaFin,
      registroTipo,
    } = req.query;

    // Validaciones básicas
    if (!["mensual", "anual", "rango"].includes(tipoReporte)) {
      return res.status(400).json({ mensaje: "tipoReporte inválido" });
    }
    if (tipoReporte === "mensual" && !mes) {
      return res.status(400).json({ mensaje: "Debe enviar mes (1-12)" });
    }
    if (tipoReporte === "rango" && (!fechaInicio || !fechaFin)) {
      return res
        .status(400)
        .json({ mensaje: "Debe enviar fechaInicio y fechaFin (YYYY-MM-DD)" });
    }

    // 1) Construcción del periodo (personalizable)
    const { fIni, fFin, periodoLabel, fechaInicioTexto, fechaFinTexto } =
      construirRangoFechas({
        tipoReporte,
        mes,
        anio,
        fechaInicio,
        fechaFin,
      });

    // 2) Filtro opcional por tipo de registro (facturasGastos, firmas, etc.)
    const filtroTipoSql = registroTipo ? "AND a.registroTipo = ?" : "";
    const paramsTipo = registroTipo ? [registroTipo] : [];

    // 3) Totales del periodo (normalizando enums históricos)
    const [[tot]] = await db.query(
      `SELECT
         SUM(e.accion IN ('subida','subidaArchivo'))            AS subidos,
         SUM(e.accion IN ('sustitucion','sustitucionArchivo'))  AS reemplazados,
         SUM(e.accion IN ('eliminacion','eliminacionArchivo'))  AS eliminados,
         SUM(e.accion = 'borradoDefinitivo')                    AS borrados
       FROM eventosArchivo e
       JOIN archivos a ON a.id = e.archivoId
      WHERE e.fechaHora >= ? AND e.fechaHora < ? ${filtroTipoSql}`,
      [fIni, fFin, ...paramsTipo]
    );

    const totales = {
      subidos: Number(tot?.subidos || 0),
      reemplazados: Number(tot?.reemplazados || 0),
      eliminados: Number(tot?.eliminados || 0),
      borrados: Number(tot?.borrados || 0),
    };

    // 4) Detalle (hasta 500 filas para PDFs manejables)
    const [rows] = await db.query(
      `SELECT 
         e.fechaHora,
         CASE
           WHEN e.accion IN ('subida','subidaArchivo')           THEN 'subidaArchivo'
           WHEN e.accion IN ('eliminacion','eliminacionArchivo') THEN 'eliminacionArchivo'
           WHEN e.accion IN ('sustitucion','sustitucionArchivo') THEN 'sustitucionArchivo'
           WHEN e.accion = 'borradoDefinitivo'                   THEN 'borradoDefinitivo'
           ELSE ''
         END AS accionNorm,
         u.nombre         AS usuarioNombre,
         a.nombreOriginal AS nombreArchivo,
         a.extension      AS extension
       FROM eventosArchivo e
       JOIN archivos a      ON a.id = e.archivoId
  LEFT JOIN usuarios u      ON u.id = e.creadoPor
      WHERE e.fechaHora >= ? AND e.fechaHora < ? ${filtroTipoSql}
      ORDER BY e.fechaHora DESC
      LIMIT 500`,
      [fIni, fFin, ...paramsTipo]
    );

    const detalleMovimientos = rows
      .filter((r) => r.accionNorm) // fuera vacíos
      .map((r) => ({
        fecha: new Date(r.fechaHora).toLocaleDateString("es-VE"),
        hora: new Date(r.fechaHora).toLocaleTimeString("es-VE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        usuario: r.usuarioNombre || "—",
        tipoAccion: r.accionNorm,
        archivo: `${r.nombreArchivo || "—"}${
          r.extension ? "." + r.extension : ""
        }`,
        observaciones: "", // si luego decides añadir columna, la mapeas aquí
      }));

    // 5) Generar HTML (misma idea que Orden de Pago)
    const html = generarHTMLEventosArchivos({
      usuario: req.user?.nombre || "admin",
      periodoLabel,
      fechaInicioTexto,
      fechaFinTexto,
      totales,
      detalleMovimientos,
      logoUrl: null, // si quieres, pásame un dataURL/URL
    });

    // 6) Puppeteer → PDF (idéntico a tu patrón de solicitudesPago)
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
      margin: { top: "14mm", bottom: "14mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    // 7) Respuesta
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=reporte_movimientos_${tipoReporte}.pdf`,
      })
      .send(pdfBuffer);
  } catch (error) {
    console.error("error generarPdfMovimientosArchivos:", error);
    res.status(500).json({ mensaje: "No fue posible generar el PDF" });
  }
};
