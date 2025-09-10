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
  try {
    const usuarioId = req?.user?.id; // viene del middleware autenticarUsuario
    if (!usuarioId) {
      return res.status(401).json({ ok: false, mensaje: "Sesión inválida." });
    }

    const sqlEstadisticas = `
      SELECT
        COUNT(*)                                 AS totalArchivos,
        MAX(IFNULL(a.tamanioBytes,0))            AS archivoMasGrandeBytes,
        MIN(IFNULL(a.tamanioBytes,0))            AS archivoMasPequenioBytes,
        AVG(IFNULL(a.tamanioBytes,0))            AS promedioTamBytes
      FROM archivos a
      WHERE a.subidoPor = ?
        AND a.estado IN ('activo','reemplazado','eliminado')
    `;

    const [filas] = await pool.query(sqlEstadisticas, [usuarioId]);
    const estadisticas = filas?.[0] ?? {
      totalArchivos: 0,
      archivoMasGrandeBytes: 0,
      archivoMasPequenioBytes: 0,
      promedioTamBytes: 0,
    };

    // Datos para el anillo/progreso (usuarios.cuotaMb y usuarios.usoStorageBytes)
    const sqlUsuario = `
      SELECT cuotaMb, usoStorageBytes
      FROM usuarios
      WHERE id = ?
    `;
    const [filasUsuario] = await pool.query(sqlUsuario, [usuarioId]);
    const { cuotaMb = 50, usoStorageBytes = 0 } = filasUsuario?.[0] ?? {};

    const cuotaBytes = (cuotaMb ?? 50) * 1024 * 1024;
    const porcentajeUsado =
      cuotaBytes > 0
        ? Math.min(100, Math.round((usoStorageBytes / cuotaBytes) * 100))
        : 0;

    return res.json({
      ok: true,
      datos: {
        ...estadisticas,
        cuotaMb,
        usoStorageBytes,
        porcentajeUsado,
      },
    });
  } catch (error) {
    console.error("Error en obtenerEstadisticasAlmacenamiento:", error);
    return res
      .status(500)
      .json({
        ok: false,
        mensaje: "Error al obtener estadísticas de almacenamiento.",
      });
  }
};

// Cuenta real de archivos por tipo del usuario autenticado
export const obtenerArchivosPorTipo = async (req, res) => {
  const usuarioId = req?.user?.id;
  if (!usuarioId) {
    return res.status(401).json({ ok: false, mensaje: "Sesión inválida." });
  }

  // Normalizamos extensión a minúsculas y sin punto para coincidir con tus datos (e.g., 'jpg','png')
  const sql = `
    SELECT
      SUM(CASE 
            WHEN LOWER(REPLACE(a.extension,'.','')) IN 
                 ('pdf','doc','docx','xls','xlsx','ppt','pptx','txt')
            THEN 1 ELSE 0 
          END) AS documentos,
      SUM(CASE 
            WHEN LOWER(REPLACE(a.extension,'.','')) IN 
                 ('jpg','jpeg','png','gif','bmp','svg','webp')
            THEN 1 ELSE 0 
          END) AS imagenes,
      SUM(CASE 
            WHEN LOWER(REPLACE(a.extension,'.','')) IN 
                 ('mp4','avi','mov','mkv','wmv','flv')
            THEN 1 ELSE 0 
          END) AS videos,
      SUM(CASE 
            WHEN LOWER(REPLACE(a.extension,'.','')) IN 
                 ('mp3','wav','aac','ogg','flac')
            THEN 1 ELSE 0 
          END) AS audio,
      SUM(CASE 
            WHEN LOWER(REPLACE(a.extension,'.','')) NOT IN 
                 ('pdf','doc','docx','xls','xlsx','ppt','pptx','txt',
                  'jpg','jpeg','png','gif','bmp','svg','webp',
                  'mp4','avi','mov','mkv','wmv','flv',
                  'mp3','wav','aac','ogg','flac')
            THEN 1 ELSE 0 
          END) AS otros
    FROM archivos a
    WHERE a.subidoPor = ?
      AND a.estado IN ('activo','reemplazado','eliminado')
  `;

  try {
    const [rows] = await db.query(sql, [usuarioId]);
    const conteos = rows?.[0] || {
      documentos: 0,
      imagenes: 0,
      videos: 0,
      audio: 0,
      otros: 0,
    };

    return res.json({
      ok: true,
      datos: {
        documentos: Number(conteos.documentos || 0),
        imagenes: Number(conteos.imagenes || 0),
        videos: Number(conteos.videos || 0),
        audio: Number(conteos.audio || 0),
        otros: Number(conteos.otros || 0),
      },
    });
  } catch (error) {
    console.error("Error en obtenerArchivosPorTipo:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al obtener archivos por tipo.",
    });
  }
};
