import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import { s3 } from "../utils/s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// Controlador para subir archivo
export const subirArchivo = async (req, res) => {
  const usuarioId = req.user.id;
  const { carpetaId, registroTipo, registroId } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "Archivo no proporcionado." });
  }

  if (!registroTipo || !registroId) {
    return res.status(400).json({
      message: "Faltan parámetros obligatorios (registroTipo o registroId).",
    });
  }

  try {
    const { originalname, key } = req.file;
    const extension = originalname.split(".").pop();

    // Insertar en la tabla archivos
    const [result] = await db.execute(
      `INSERT INTO archivos 
      (carpetaId, registroTipo, registroId, nombreOriginal, extension, subidoPor) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        carpetaId || null,
        registroTipo,
        registroId,
        originalname,
        extension,
        usuarioId,
      ]
    );

    const archivoId = result.insertId;

    // Registrar el evento de subida en eventosArchivo
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, 'subida', ?, ?, ?, ?)`,
      [
        archivoId,
        usuarioId,
        req.ip,
        req.headers["user-agent"],
        JSON.stringify({ s3Key: key }),
      ]
    );

    // Respuesta JSON
    res.status(201).json({
      message: "Archivo subido correctamente",
      archivoId,
      nombreOriginal: originalname,
      s3Key: key,
    });
  } catch (error) {
    console.error("Error al subir archivo:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al subir archivo" });
  }
};

// Controlador para descargar archivo
export const descargarArchivo = async (req, res) => {
  const { id } = req.params;

  try {
    // Consultar la key del archivo desde la BD
    const [[archivo]] = await db.query(
      "SELECT nombreOriginal, extension, creadoEn, registroTipo, documento FROM archivos WHERE id = ? AND estado = 'activo'",
      [id]
    );

    if (!archivo || !archivo.documento) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no disponible." });
    }

    // Generar URL prefirmada con validez de 10 minutos (600 segundos)
    const url = await generarUrlPrefirmadaLectura(archivo.documento, 600);

    // Registrar evento de descarga en auditoría
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, 'descarga', ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        req.ip,
        req.headers["user-agent"],
        JSON.stringify({ s3Key: archivo.documento }),
      ]
    );

    res.json({
      nombreOriginal: archivo.nombreOriginal,
      url,
    });
  } catch (error) {
    console.error("Error al generar URL para descargar archivo:", error);
    res.status(500).json({ message: "Error interno al descargar archivo." });
  }
};

// Controlador para listar archivos con paginación y búsqueda
export const listarArchivos = async (req, res) => {
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10;
  const offset = (page - 1) * limit;
  const q = (req.query.search || "").trim();

  try {
    // 1) Total de archivos filtrados
    const [[{ total }]] = await db.query(
      q
        ? `SELECT COUNT(*) AS total
           FROM archivos a
           LEFT JOIN usuarios u ON u.id = a.subidoPor
           WHERE a.nombreOriginal LIKE ? OR u.nombre LIKE ?`
        : `SELECT COUNT(*) AS total FROM archivos`,
      q ? [`%${q}%`, `%${q}%`] : []
    );

    // 2) Obtener lista de archivos paginada y filtrada
    const [archivos] = await db.query(
      `
      SELECT a.id,
             a.nombreOriginal,
             a.extension,
             a.estado,
             a.creadoEn,
             a.actualizadoEn,
             u.nombre AS subidoPor,
             a.registroTipo,
             a.registroId
      FROM archivos a
      LEFT JOIN usuarios u ON u.id = a.subidoPor
      ${q ? "WHERE a.nombreOriginal LIKE ? OR u.nombre LIKE ?" : ""}
      ORDER BY a.creadoEn DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      q ? [`%${q}%`, `%${q}%`] : []
    );

    res.json({ data: archivos, total, page, limit });
  } catch (error) {
    console.error("Error al listar archivos:", error);
    res.status(500).json({ message: "Error interno al listar archivos" });
  }
};

// Controlador para eliminar archivo (soft-delete)
export const eliminarArchivo = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user.id;

  try {
    // Verificar existencia del archivo
    const [[archivoExistente]] = await db.query(
      "SELECT estado FROM archivos WHERE id = ?",
      [id]
    );

    if (!archivoExistente) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Verificar si ya está eliminado
    if (archivoExistente.estado === "eliminado") {
      return res.status(400).json({ message: "El archivo ya está eliminado." });
    }

    // Soft delete: marcar archivo como eliminado
    await db.execute(
      `UPDATE archivos 
       SET estado = 'eliminado', eliminadoEn = NOW(), actualizadoEn = NOW()
       WHERE id = ?`,
      [id]
    );

    // Registrar evento en auditoría
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent)
       VALUES (?, 'eliminacion', ?, ?, ?)`,
      [id, usuarioId, req.ip, req.headers["user-agent"]]
    );

    res.json({ message: "Archivo eliminado correctamente (soft delete)." });
  } catch (error) {
    console.error("Error al eliminar archivo:", error);
    res.status(500).json({ message: "Error interno al eliminar archivo." });
  }
};

// Controlador para restaurar archivo desde estado 'eliminado'
export const restaurarArchivo = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user.id;

  try {
    // Verificar si el archivo existe y está eliminado
    const [[archivoExistente]] = await db.query(
      "SELECT estado FROM archivos WHERE id = ?",
      [id]
    );

    if (!archivoExistente) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    if (archivoExistente.estado !== "eliminado") {
      return res
        .status(400)
        .json({ message: "El archivo no está en la papelera." });
    }

    // Restaurar el archivo
    await db.execute(
      `UPDATE archivos 
       SET estado = 'activo', eliminadoEn = NULL, actualizadoEn = NOW()
       WHERE id = ?`,
      [id]
    );

    // Registrar evento en auditoría
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent)
       VALUES (?, 'restauracion', ?, ?, ?)`,
      [id, usuarioId, req.ip, req.headers["user-agent"]]
    );

    res.json({ message: "Archivo restaurado correctamente." });
  } catch (error) {
    console.error("Error al restaurar archivo:", error);
    res.status(500).json({ message: "Error interno al restaurar archivo." });
  }
};

// Controlador para registrar eventos manuales en la auditoría
export const registrarEvento = async (req, res) => {
  const usuarioId = req.user.id;
  const { archivoId, accion, detalles } = req.body;

  // Validar parámetros necesarios
  if (!archivoId || !accion) {
    return res
      .status(400)
      .json({ message: "Faltan parámetros obligatorios (archivoId, accion)." });
  }

  const accionesValidas = [
    "subida",
    "eliminacion",
    "restauracion",
    "descarga",
    "edicionMetadatos",
    "borradoDefinitivo",
  ];

  if (!accionesValidas.includes(accion)) {
    return res.status(400).json({ message: "Acción no válida." });
  }

  try {
    // Verificar que el archivo existe
    const [[archivo]] = await db.query("SELECT id FROM archivos WHERE id = ?", [
      archivoId,
    ]);

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Registrar evento
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        archivoId,
        accion,
        usuarioId,
        req.ip,
        req.headers["user-agent"],
        detalles ? JSON.stringify(detalles) : null,
      ]
    );

    res.json({ message: "Evento registrado correctamente." });
  } catch (error) {
    console.error("Error al registrar evento:", error);
    res.status(500).json({ message: "Error interno al registrar evento." });
  }
};

// Controlador para listar historial de versiones de un archivo
export const listarHistorialVersiones = async (req, res) => {
  const { archivoId } = req.params;

  try {
    // Verificar si el archivo existe
    const [[archivo]] = await db.query(
      "SELECT id, nombreOriginal FROM archivos WHERE id = ?",
      [archivoId]
    );

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Obtener lista de versiones
    const [versiones] = await db.query(
      `
      SELECT v.id,
             v.numeroVersion,
             v.fecha,
             v.usuarioId,
             u.nombre AS usuario,
             v.comentario,
             v.documento AS keyS3
      FROM versionesArchivo v
      LEFT JOIN usuarios u ON u.id = v.usuarioId
      WHERE v.archivoId = ?
      ORDER BY v.numeroVersion DESC
      `,
      [archivoId]
    );

    res.json({
      archivo: {
        id: archivo.id,
        nombreOriginal: archivo.nombreOriginal,
      },
      versiones,
    });
  } catch (error) {
    console.error("Error al listar historial de versiones:", error);
    res
      .status(500)
      .json({ message: "Error interno al obtener historial de versiones." });
  }
};

// Controlador para descargar una versión específica del archivo
export const descargarVersion = async (req, res) => {
  const { versionId } = req.params;
  const usuarioId = req.user.id;

  try {
    // 1. Obtener la versión
    const [[version]] = await db.query(
      `SELECT archivoId, documento AS keyS3 
       FROM versionesArchivo 
       WHERE id = ?`,
      [versionId]
    );

    if (!version) {
      return res.status(404).json({ message: "Versión no encontrada." });
    }

    // 2. Generar URL prefirmada (válida 10 min)
    const url = await generarUrlPrefirmadaLectura(version.keyS3, 600);

    // 3. Registrar evento en auditoría
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'descarga', ?, ?, ?, ?)`,
      [
        version.archivoId,
        versionId,
        usuarioId,
        req.ip,
        req.headers["user-agent"],
        JSON.stringify({ versionId, s3Key: version.keyS3 }),
      ]
    );

    res.json({ url });
  } catch (error) {
    console.error("Error al generar URL para versión:", error);
    res
      .status(500)
      .json({ message: "Error interno al descargar versión del archivo." });
  }
};

// Restaurar una versión específica como la versión activa del archivo
export const restaurarVersion = async (req, res) => {
  const { versionId } = req.body;
  const usuarioId = req.user.id;

  if (!versionId) {
    return res.status(400).json({ message: "versionId es obligatorio." });
  }

  try {
    // Obtener versión
    const [[version]] = await db.query(
      `SELECT v.*, a.nombreOriginal
       FROM versionesArchivo v
       JOIN archivos a ON a.id = v.archivoId
       WHERE v.id = ?`,
      [versionId]
    );

    if (!version) {
      return res.status(404).json({ message: "Versión no encontrada." });
    }

    // Actualizar archivo principal con los datos de esta versión
    await db.execute(
      `UPDATE archivos 
       SET documento = ?, actualizadoEn = NOW()
       WHERE id = ?`,
      [version.documento, version.archivoId]
    );

    // Registrar evento
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'restauracion', ?, ?, ?, ?)`,
      [
        version.archivoId,
        versionId,
        usuarioId,
        req.ip,
        req.headers["user-agent"],
        JSON.stringify({
          comentario: version.comentario,
          versionRestaurada: version.numeroVersion,
          keyRestaurada: version.documento,
        }),
      ]
    );

    res.json({
      message: `Versión ${version.numeroVersion} restaurada correctamente.`,
    });
  } catch (error) {
    console.error("Error al restaurar versión:", error);
    res.status(500).json({ message: "Error interno al restaurar versión." });
  }
};

export const eliminarDefinitivamente = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user.id;

  try {
    // 1. Buscar archivo
    const [[archivo]] = await db.query(
      `SELECT documento, estado FROM archivos WHERE id = ?`,
      [id]
    );

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    if (archivo.estado !== "eliminado") {
      return res.status(400).json({
        message: "Solo se pueden eliminar archivos que están en papelera.",
      });
    }

    // 2. Eliminar archivo en S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: archivo.documento,
      })
    );

    // 3. Eliminar de la base de datos
    await db.execute(`DELETE FROM archivos WHERE id = ?`, [id]);

    // 4. Registrar evento en auditoría
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, 'borradoDefinitivo', ?, ?, ?, ?)`,
      [
        id,
        usuarioId,
        req.ip,
        req.headers["user-agent"],
        JSON.stringify({ s3Key: archivo.documento }),
      ]
    );

    res.json({
      message: "Archivo eliminado permanentemente de la plataforma y S3.",
    });
  } catch (error) {
    console.error("Error en eliminación definitiva:", error);
    res.status(500).json({ message: "Error interno al eliminar el archivo." });
  }
};
