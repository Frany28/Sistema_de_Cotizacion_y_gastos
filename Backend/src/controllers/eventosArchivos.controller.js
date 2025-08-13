// src/controllers/eventosArchivos.controller.js
import db from "../config/database.js";

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

  // Filtro opcional por registroTipo (aplica a métricas donde corresponde)
  const filtroTipoSql = registroTipo ? "AND a.registroTipo = ?" : [];
  const paramsTipo = registroTipo ? [registroTipo] : [];

  try {
    const [[m1]] = await db.query(
      `SELECT COUNT(*) AS totalArchivosActivos
         FROM archivos a
        WHERE a.estado = 'activo' ${filtroTipoSql}`,
      paramsTipo
    );

    const [[m2]] = await db.query(
      `SELECT COUNT(*) AS totalEventosMes
         FROM eventosArchivo e
        WHERE e.fechaHora >= ? AND e.fechaHora < ?`,
      [fechaInicio, fechaFin]
    );

    // ✅ AHORA cuenta versiones desde versionesArchivo (no desde archivos)
    const [[m3]] = await db.query(
      `SELECT COUNT(*) AS totalVersionesMes
         FROM versionesArchivo v
         JOIN archivos a ON a.id = v.archivoId
        WHERE v.creadoEn >= ? AND v.creadoEn < ?
              ${filtroTipoSql}`,
      [fechaInicio, fechaFin, ...paramsTipo]
    );

    const [[m4]] = await db.query(
      `SELECT COALESCE(SUM(a.tamanioBytes),0) AS totalAlmacenamientoBytes
         FROM archivos a
        WHERE 1=1 ${filtroTipoSql}`,
      paramsTipo
    );

    return res.json({
      totalArchivosActivos: m1.totalArchivosActivos,
      totalEventosMes: m2.totalEventosMes,
      totalVersionesMes: m3.totalVersionesMes,
      totalAlmacenamientoBytes: m4.totalAlmacenamientoBytes,
    });
  } catch (error) {
    console.error("Error en obtenerMetricasTablero:", error);
    return res.status(500).json({ mensaje: "Error al obtener métricas" });
  }
};

// B) TENDENCIA DE ACTIVIDAD (últimos N días)
export const obtenerTendenciaActividad = async (req, res) => {
  const dias = Math.max(7, Math.min(180, Number(req.query.dias ?? 30)));
  const { registroTipo, accion } = req.query;

  const fechaFin = new Date();
  fechaFin.setHours(0, 0, 0, 0);
  const fechaInicio = new Date(fechaFin);
  fechaInicio.setDate(fechaFin.getDate() - (dias - 1));

  // Orden correcto de parámetros: primero fechas del CTE, luego filtros
  const params = [fechaInicio, fechaFin];

  const filtroTipoSql = registroTipo ? "AND a.registroTipo = ?" : "";
  if (registroTipo) params.push(registroTipo);

  // ✅ Si no se filtra por acción, excluimos acciones vacías
  const filtroAccionSql = accion ? "AND e.accion = ?" : "AND e.accion <> ''";
  if (accion) params.push(accion);

  try {
    const [rows] = await db.query(
      `
      WITH RECURSIVE fechas AS (
        SELECT DATE(?) AS f
        UNION ALL
        SELECT DATE_ADD(f, INTERVAL 1 DAY) FROM fechas
        WHERE f < DATE(?)
      )
      SELECT
        f.f AS fecha,
        SUM(CASE WHEN e.accion = 'subida'            THEN 1 ELSE 0 END) AS subidas,
        SUM(CASE WHEN e.accion = 'eliminacion'       THEN 1 ELSE 0 END) AS eliminaciones,
        SUM(CASE WHEN e.accion = 'sustitucion'       THEN 1 ELSE 0 END) AS sustituciones,
        SUM(CASE WHEN e.accion = 'edicionMetadatos'  THEN 1 ELSE 0 END) AS edicionesMetadatos,
        SUM(CASE WHEN e.accion = 'borradoDefinitivo' THEN 1 ELSE 0 END) AS borradosDefinitivos
      FROM fechas f
      LEFT JOIN eventosArchivo e
        ON DATE(e.fechaHora) = f.f
      LEFT JOIN archivos a
        ON a.id = e.archivoId
      WHERE 1=1
        ${filtroTipoSql}
        ${filtroAccionSql}
      GROUP BY f.f
      ORDER BY f.f ASC
      `,
      params
    );

    return res.json({ desde: fechaInicio, hasta: fechaFin, dias, serie: rows });
  } catch (error) {
    console.error("Error en obtenerTendenciaActividad:", error);
    return res.status(500).json({ mensaje: "Error al obtener tendencia" });
  }
};

/* =====  B) FEED DE ACTIVIDAD  ===== */

// C) FEED DE ACTIVIDAD (corrige actor a creadoPor y filtra acciones vacías por defecto)
export const listarActividadReciente = async (req, res) => {
  const creadoPorUsuario = req.user.id;
  const rolId = req.user.rol_id;
  const esVistaCompleta = rolId === 1 || rolId === 2; // admin o supervisor

  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 10)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const { q, accion, registroTipo, desde, hasta } = req.query;

  const filtros = [];
  const params = [];

  if (accion) {
    filtros.push("e.accion = ?");
    params.push(accion);
  } else {
    // ✅ evita filas con acción vacía
    filtros.push("e.accion <> ''");
  }

  if (registroTipo) {
    filtros.push("a.registroTipo = ?");
    params.push(registroTipo);
  }

  if (q) {
    filtros.push("a.nombreOriginal LIKE ?");
    params.push(`%${q}%`);
  }

  if (desde) {
    filtros.push("e.fechaHora >= ?");
    params.push(new Date(`${desde}T00:00:00`));
  }

  if (hasta) {
    filtros.push("e.fechaHora < ?");
    params.push(new Date(`${hasta}T23:59:59`));
  }

  // Empleado: ve lo que subió él o eventos que él mismo ejecutó
  if (!esVistaCompleta) {
    filtros.push("(a.subidoPor = ? OR e.creadoPor = ?)");
    params.push(creadoPorUsuario, creadoPorUsuario);
  }

  const whereSql = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

  try {
    const [eventos] = await db.query(
      `
      SELECT
        e.id              AS eventoId,
        e.fechaHora       AS fechaEvento,
        e.accion          AS tipoEvento,
        e.creadoPor       AS usuarioId,
        u.nombre          AS usuarioNombre,
        a.id              AS archivoId,
        a.nombreOriginal  AS nombreArchivo,
        a.extension       AS extension,
        a.tamanioBytes    AS tamanioBytes,
        a.registroTipo    AS registroTipo,
        a.registroId      AS registroId
      FROM eventosArchivo e
      JOIN archivos a      ON a.id = e.archivoId
      LEFT JOIN usuarios u ON u.id = e.creadoPor
      ${whereSql}
      ORDER BY e.fechaHora DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return res.json({ eventos, limit, offset });
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

    // ✅ cuenta en versionesArchivo por archivoId
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
