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

function rango({ tipoReporte, mes, anio, fechaInicio, fechaFin }) {
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
    // 1) Leer parámetros
    const {
      tipoReporte = "mensual",
      mes,
      anio,
      fechaInicio,
      fechaFin,
      registroTipo,
    } = req.query;

    // Normalizar rango de fechas
    let desde, hasta, periodoLabel;
    const hoy = new Date();

    if (tipoReporte === "mensual") {
      const m = Number(mes ?? hoy.getMonth() + 1);
      const y = Number(anio ?? hoy.getFullYear());
      desde = new Date(y, m - 1, 1, 0, 0, 0, 0);
      hasta = new Date(y, m, 1, 0, 0, 0, 0);
      periodoLabel = `Mensual ${String(m).padStart(2, "0")}/${y}`;
    } else if (tipoReporte === "anual") {
      const y = Number(anio ?? hoy.getFullYear());
      desde = new Date(y, 0, 1, 0, 0, 0, 0);
      hasta = new Date(y + 1, 0, 1, 0, 0, 0, 0);
      periodoLabel = `Anual ${y}`;
    } else if (tipoReporte === "rango") {
      desde = new Date(`${fechaInicio}T00:00:00`);
      hasta = new Date(`${fechaFin}T23:59:59`);
      periodoLabel = `Rango ${fechaInicio} a ${fechaFin}`;
    } else {
      return res.status(400).json({ mensaje: "tipoReporte inválido" });
    }

    // 2) Armar filtros
    const filtrosEvento = ["e.fechaHora >= ? AND e.fechaHora <= ?"];
    const paramsEvento = [desde, hasta];

    if (registroTipo) {
      filtrosEvento.push("a.registroTipo = ?");
      paramsEvento.push(registroTipo);
    }

    // 3) Totales por tipo de acción (ajusta a tus enums reales)
    const [[totales]] = await db.query(
      `
        SELECT
          SUM(CASE WHEN e.accion = 'subida' THEN 1 ELSE 0 END)            AS subidos,
          SUM(CASE WHEN e.accion = 'sustitucion' THEN 1 ELSE 0 END)       AS reemplazados,
          SUM(CASE WHEN e.accion = 'eliminacion' THEN 1 ELSE 0 END)       AS eliminados,
          SUM(CASE WHEN e.accion = 'borradoDefinitivo' THEN 1 ELSE 0 END) AS borrados
        FROM eventosArchivo e
        JOIN archivos a ON a.id = e.archivoId
        WHERE ${filtrosEvento.join(" AND ")}
      `,
      paramsEvento
    );

    // 4) Detalle (top N filas)
    const [detalle] = await db.query(
      `
        SELECT
          DATE_FORMAT(e.fechaHora, '%d/%m/%Y') AS fecha,
          DATE_FORMAT(e.fechaHora, '%H:%i')    AS hora,
          COALESCE(u.nombre, CONCAT('Usuario #', e.creadoPor)) AS usuario,
          e.accion    AS tipoAccion,
          a.nombreOriginal AS archivo
        FROM eventosArchivo e
        JOIN archivos a      ON a.id = e.archivoId
        LEFT JOIN usuarios u ON u.id = e.creadoPor
        WHERE ${filtrosEvento.join(" AND ")}
        ORDER BY e.fechaHora DESC
        LIMIT 500
      `,
      paramsEvento
    );

    // 5) Generar PDF con PDFKit
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res
        .set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename=reporte_movimientos_${tipoReporte}.pdf`,
        })
        .send(pdfBuffer);
    });

    // Encabezado
    doc
      .fontSize(16)
      .text("REPORTE DE MOVIMIENTOS DE ARCHIVOS", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#555").text(periodoLabel, { align: "left" });
    doc.moveDown(0.8);
    doc.fillColor("#000");

    // Totales
    doc.fontSize(12).text("Resumen", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11);
    doc.text(`Subidos: ${totales?.subidos ?? 0}`);
    doc.text(`Reemplazados: ${totales?.reemplazados ?? 0}`);
    doc.text(`Eliminados: ${totales?.eliminados ?? 0}`);
    doc.text(`Borrados: ${totales?.borrados ?? 0}`);

    // Detalle
    doc.moveDown(0.8);
    doc.fontSize(12).text("Detalle (máx. 500)", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);
    detalle.forEach((r, i) => {
      doc.text(
        `${String(i + 1).padStart(3, "0")} | ${r.fecha} ${r.hora} | ${
          r.usuario
        } | ${r.tipoAccion} | ${r.archivo}`
      );
    });

    doc.end();
  } catch (error) {
    console.error("Error en generarPdfMovimientosArchivos:", error);
    return res.status(500).json({ mensaje: "No se pudo generar el PDF" });
  }
};
