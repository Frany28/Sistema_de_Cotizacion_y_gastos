// src/controllers/perfil.controller.js
import db from "../config/database.js";

/**
 * GET /api/perfil/tarjeta
 * Devuelve datos del usuario autenticado y su estado de almacenamiento.
 * Respuesta:
 * {
 *   usuario: { usuarioId, nombre, email, codigo, rolNombre },
 *   almacenamiento: { cuotaMb, usadoBytes, usadoMb, porcentajeUso, ilimitado }
 * }
 */
export const obtenerTarjetaUsuario = async (req, res) => {
  // 1) Usuario desde el middleware de autenticación
  const usuarioId = req?.user?.id;
  if (!usuarioId) {
    return res.status(401).json({ ok: false, mensaje: "Sesión inválida." });
  }

  // 2) Traer perfil + rol
  const sqlPerfil = `
    SELECT 
      u.id              AS usuarioId,
      u.nombre          AS nombre,
      u.email           AS email,
      u.codigo          AS codigo,
      u.cuotaMb         AS cuotaMb,
      u.usoStorageBytes AS usoStorageBytes,
      r.nombre          AS rolNombre
    FROM usuarios u
    LEFT JOIN roles r ON r.id = u.rol_id
    WHERE u.id = ?
    LIMIT 1
  `;

  try {
    const [rows] = await db.query(sqlPerfil, [usuarioId]);
    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, mensaje: "Usuario no encontrado." });
    }

    const fila = rows[0];
    const cuotaMb = fila.cuotaMb; // puede ser NULL (ilimitado)
    const usadoBytes = Number(fila.usoStorageBytes || 0);
    const usadoMb = +(usadoBytes / (1024 * 1024)).toFixed(2);

    const ilimitado = cuotaMb === null || cuotaMb === undefined;
    const porcentajeUso =
      !ilimitado && cuotaMb > 0
        ? +((usadoMb / cuotaMb) * 100).toFixed(2)
        : null;

    return res.json({
      ok: true,
      usuario: {
        usuarioId: fila.usuarioId,
        nombre: fila.nombre,
        email: fila.email,
        codigo: fila.codigo,
        rolNombre: fila.rolNombre || "Sin rol",
      },
      almacenamiento: {
        cuotaMb: cuotaMb, // null => ilimitado
        usadoBytes: usadoBytes, // útil si el front quiere formatear
        usadoMb: usadoMb,
        porcentajeUso: porcentajeUso, // null si ilimitado
        ilimitado: Boolean(ilimitado),
      },
    });
  } catch (error) {
    console.error("Error en obtenerTarjetaUsuario:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al cargar la tarjeta del usuario.",
    });
  }
};

export const listarArchivosRecientesUsuario = async (req, res) => {
  const usuarioId = req?.user?.id;
  if (!usuarioId)
    return res.status(401).json({ ok: false, mensaje: "Sesión inválida." });

  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20); // entre 1 y 20
  const sqlRecientes = `
    SELECT 
      a.id,
      a.nombreOriginal,
      a.extension,
      a.tamanioBytes,
      a.rutaS3,
      a.creadoEn
    FROM archivos a
    WHERE a.subidoPor = ?
      AND a.estado IN ('activo','reemplazado','eliminado')
    ORDER BY a.creadoEn DESC
    LIMIT ?
  `;
  try {
    const [rows] = await db.query(sqlRecientes, [usuarioId, limit]);
    return res.json({ archivosRecientes: rows });
  } catch (error) {
    console.error("Error en listarArchivosRecientesUsuario:", error);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error al obtener archivos recientes." });
  }
};

export const obtenerEstadisticasAlmacenamiento = async (req, res) => {
  const usuarioId = req?.user?.id;
  if (!usuarioId) {
    return res.status(401).json({ ok: false, mensaje: "Sesión inválida." });
  }

  // Ojo: usamos COALESCE para soportar 'tamanioBytes' o 'tamanoBytes'
  const sqlArchivos = `
    SELECT
      COUNT(*) AS totalArchivos,
      MAX(COALESCE(a.tamanioBytes, a.tamanoBytes)) AS archivoMasGrandeBytes,
      MIN(COALESCE(a.tamanioBytes, a.tamanoBytes)) AS archivoMasPequenioBytes,
      AVG(COALESCE(a.tamanioBytes, a.tamanoBytes)) AS promedioTamBytes
    FROM archivos a
    WHERE a.subidoPor = ?
      AND a.estado IN ('activo','reemplazado','eliminado')
  `;

  const sqlGrupos = `
    SELECT COUNT(*) AS totalGrupos
    FROM archivoGrupos
    WHERE creadoPor = ?
  `;

  try {
    // 1) Ejecutar en paralelo
    const [resArchivos, resGrupos] = await Promise.all([
      db.query(sqlArchivos, [usuarioId]), // -> [rows, fields]
      db.query(sqlGrupos, [usuarioId]), // -> [rows, fields]
    ]);

    // 2) Extraer 'rows' de cada resultado
    const [rowsArchivos] = resArchivos;
    const [rowsGrupos] = resGrupos;

    // 3) Tomar la primera fila (agregados)
    const estad = rowsArchivos?.[0] || {};
    const grupos = rowsGrupos?.[0] || {};

    // 4) Normalizar
    const totalArchivos = Number(estad.totalArchivos || 0);
    const totalGrupos = Number(grupos.totalGrupos || 0);
    const archivoMasGrandeBytes = totalArchivos
      ? Number(estad.archivoMasGrandeBytes || 0)
      : 0;
    const archivoMasPequenioBytes = totalArchivos
      ? Number(estad.archivoMasPequenioBytes || 0)
      : 0;
    const promedioTamBytes = totalArchivos
      ? Math.round(Number(estad.promedioTamBytes || 0))
      : 0;

    return res.json({
      ok: true,
      totalArchivos,
      totalGrupos,
      archivoMasGrandeBytes,
      archivoMasPequenioBytes,
      promedioTamBytes,
    });
  } catch (error) {
    console.error("Error en obtenerEstadisticasAlmacenamiento:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al obtener estadísticas de almacenamiento.",
    });
  }
};
