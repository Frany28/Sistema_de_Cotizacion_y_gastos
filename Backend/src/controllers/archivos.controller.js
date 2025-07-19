import db from "../config/database.js";
import {
  s3,
  generarUrlPrefirmadaLectura,
  moverArchivoAS3AlPapelera,
} from "../utils/s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// Roles autorizados
const ROL_ADMIN = 1;
const ROL_SUPERVISOR = 2;

// Controller: sustituir (reemplazar) un archivo existente
export const sustituirArchivo = async (req, res) => {
  const conexion = await db.getConnection();
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    // 1) Datos del nuevo archivo (Multer)
    const { key: nuevaKey, originalname, size: tamanoBytes } = req.file;
    const extension = originalname.split(".").pop();

    // 2) Leer registro activo y permiso de acceso
    const [[archivo]] = await conexion.query(
      `SELECT id, rutaS3 AS keyS3, subidoPor, tamanoBytes
         FROM archivos
        WHERE registroTipo = ?
          AND registroId = ?
          AND estado = 'activo'`,
      [req.params.registroTipo, req.params.registroId]
    );
    if (!archivo)
      return res
        .status(404)
        .json({ message: "No hay archivo activo para sustituir." });
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({
        message: "Acceso denegado: no puedes sustituir este archivo.",
      });
    }

    // 3) Validar cuota de almacenamiento (50 MB)
    const [[usuario]] = await conexion.query(
      "SELECT cuotaMb, usoStorageBytes FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    const cuotaBytes = usuario.cuotaMb * 1024 * 1024;
    const usoActual = usuario.usoStorageBytes;
    const tamanoAntiguo = archivo.tamanoBytes;
    const nuevoUso = usoActual - tamanoAntiguo + tamanoBytes;
    if (nuevoUso > cuotaBytes) {
      return res
        .status(400)
        .json({ message: "Superas la cuota de almacenamiento (50 MB)." });
    }

    await conexion.beginTransaction();

    // 4) Mover archivo antiguo a carpeta papelera en S3
    await moverArchivoAS3AlPapelera(
      archivo.keyS3,
      req.params.registroTipo,
      req.params.registroId
    );

    // 5) Registrar versión anterior en versionesArchivo
    const [[{ maxVersion }]] = await conexion.query(
      "SELECT COALESCE(MAX(numeroVersion), 0) AS maxVersion FROM versionesArchivo WHERE archivoId = ?",
      [archivo.id]
    );
    const numeroVersion = maxVersion + 1;
    await conexion.query(
      `INSERT INTO versionesArchivo
         (archivoId, numeroVersion, subidoEn, subidoPorId, comentario, tamanoBytes, s3ObjectKey)
       VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
      [
        archivo.id,
        numeroVersion,
        usuarioId,
        "Reemplazo de archivo",
        archivo.tamanoBytes,
        archivo.keyS3,
      ]
    );

    // 6) Actualizar registro principal en archivos
    await conexion.query(
      "UPDATE archivos SET rutaS3 = ?, nombreOriginal = ?, extension = ?, tamanoBytes = ?, actualizadoEn = NOW() WHERE id = ?",
      [nuevaKey, originalname, extension, tamanoBytes, archivo.id]
    );

    // 7) Ajustar usoStorageBytes en usuarios
    await conexion.query(
      "UPDATE usuarios SET usoStorageBytes = ? WHERE id = ?",
      [nuevoUso, usuarioId]
    );

    // 8) Registrar evento de sustitución
    await conexion.query(
      `INSERT INTO eventosArchivo
         (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'sustitucion', ?, ?, ?, ?)`,
      [
        archivo.id,
        numeroVersion,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({ nuevaKey, extension, originalname, numeroVersion }),
      ]
    );

    await conexion.commit();
    return res.json({ message: "Archivo sustituido correctamente." });
  } catch (error) {
    await conexion.rollback();
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al sustituir archivo." });
  } finally {
    conexion.release();
  }
};

// Controller: descargar archivo activo
export const descargarArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[archivo]] = await db.query(
      `SELECT id, nombreOriginal, rutaS3 AS keyS3, subidoPor
         FROM archivos
        WHERE id = ?
          AND estado = 'activo'`,
      [archivoId]
    );
    if (!archivo)
      return res.status(404).json({ message: "Archivo no encontrado." });
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({
        message: "Acceso denegado: no puedes descargar este archivo.",
      });
    }

    const url = await generarUrlPrefirmadaLectura(archivo.keyS3, 600);
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, 'descarga', ?, ?, ?, ?)`,
      [
        archivoId,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({ key: archivo.keyS3 }),
      ]
    );

    return res.json({ nombreOriginal: archivo.nombreOriginal, url });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al descargar archivo." });
  }
};

// Controller: listar archivos con paginación y búsqueda
export const listarArchivos = async (req, res) => {
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search.trim()}%` : null;

  try {
    let where = "WHERE a.estado = 'activo'";
    const params = [];

    if (![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId)) {
      where += " AND a.subidoPor = ?";
      params.push(usuarioId);
    }
    if (search) {
      where += " AND a.nombreOriginal LIKE ?";
      params.push(search);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM archivos a ${where}`,
      params
    );

    const [data] = await db.query(
      `SELECT a.id,
              a.nombreOriginal,
              a.extension,
              a.tamanoBytes,
              a.creadoEn,
              a.actualizadoEn,
              u.nombre AS subidoPor,
              a.registroTipo,
              a.registroId
         FROM archivos a
    JOIN usuarios u ON u.id = a.subidoPor
        ${where}
     ORDER BY a.creadoEn DESC
     LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ data, total, page, limit });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al listar archivos." });
  }
};

// Controller: eliminar archivo (soft-delete)
export const eliminarArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[archivo]] = await db.query(
      "SELECT estado, subidoPor, tamanoBytes FROM archivos WHERE id = ?",
      [archivoId]
    );
    if (!archivo)
      return res.status(404).json({ message: "Archivo no encontrado." });
    if (archivo.estado === "eliminado") {
      return res.status(400).json({ message: "El archivo ya está eliminado." });
    }
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res
        .status(403)
        .json({ message: "Acceso denegado: no puedes eliminar este archivo." });
    }

    await db.execute(
      "UPDATE archivos SET estado = 'eliminado', eliminadoEn = NOW(), actualizadoEn = NOW() WHERE id = ?",
      [archivoId]
    );
    // Ajustar uso de almacenamiento
    await db.execute(
      "UPDATE usuarios SET usoStorageBytes = usoStorageBytes - ? WHERE id = ?",
      [archivo.tamanoBytes, archivo.subidoPor]
    );
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent)
       VALUES (?, 'eliminacion', ?, ?, ?)`,
      [archivoId, usuarioId, req.ip, req.get("User-Agent")]
    );

    return res.json({
      message: "Archivo eliminado correctamente (soft delete).",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al eliminar archivo." });
  }
};

// Controller: restaurar archivo desde papelera
export const restaurarArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[archivo]] = await db.query(
      "SELECT estado, subidoPor FROM archivos WHERE id = ?",
      [archivoId]
    );
    if (!archivo)
      return res.status(404).json({ message: "Archivo no encontrado." });
    if (archivo.estado !== "eliminado") {
      return res
        .status(400)
        .json({ message: "El archivo no está en la papelera." });
    }
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({
        message: "Acceso denegado: no puedes restaurar este archivo.",
      });
    }

    await db.execute(
      "UPDATE archivos SET estado = 'activo', eliminadoEn = NULL, actualizadoEn = NOW() WHERE id = ?",
      [archivoId]
    );
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent)
       VALUES (?, 'restauracion', ?, ?, ?)`,
      [archivoId, usuarioId, req.ip, req.get("User-Agent")]
    );

    return res.json({ message: "Archivo restaurado correctamente." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al restaurar archivo." });
  }
};

// Controller: listar historial de versiones
export const listarHistorialVersiones = async (req, res) => {
  const archivoId = Number(req.params.archivoId);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[registro]] = await db.query(
      "SELECT subidoPor FROM archivos WHERE id = ?",
      [archivoId]
    );
    if (!registro)
      return res.status(404).json({ message: "Archivo no encontrado." });
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      registro.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    const [versiones] = await db.query(
      `SELECT v.id, v.numeroVersion, v.subidoEn AS fecha, v.subidoPorId AS usuarioId,
              u.nombre AS usuario, v.comentario, v.tamanoBytes, v.s3ObjectKey AS keyS3
         FROM versionesArchivo v
    JOIN usuarios u ON u.id = v.subidoPorId
        WHERE v.archivoId = ?
     ORDER BY v.numeroVersion DESC`,
      [archivoId]
    );

    return res.json({ archivoId, versiones });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al listar historial de versiones." });
  }
};

// Controller: descargar una versión específica
export const descargarVersion = async (req, res) => {
  const versionId = Number(req.params.versionId);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[version]] = await db.query(
      `SELECT v.archivoId, v.s3ObjectKey AS keyS3, a.subidoPor
         FROM versionesArchivo v
    JOIN archivos a ON a.id = v.archivoId
        WHERE v.id = ?`,
      [versionId]
    );
    if (!version)
      return res.status(404).json({ message: "Versión no encontrada." });
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      version.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    const url = await generarUrlPrefirmadaLectura(version.keyS3, 600);
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'descarga', ?, ?, ?, ?)`,
      [
        version.archivoId,
        versionId,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({ key: version.keyS3 }),
      ]
    );

    return res.json({ url });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al descargar versión." });
  }
};

// Controller: restaurar versión específica como activa
export const restaurarVersion = async (req, res) => {
  const versionId = Number(req.body.versionId);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  if (!versionId) {
    return res.status(400).json({ message: "versionId es obligatorio." });
  }

  try {
    const [[version]] = await db.query(
      `SELECT v.archivoId, v.numeroVersion, v.s3ObjectKey AS keyS3, v.tamanoBytes, a.subidoPor
         FROM versionesArchivo v
    JOIN archivos a ON a.id = v.archivoId
        WHERE v.id = ?`,
      [versionId]
    );
    if (!version)
      return res.status(404).json({ message: "Versión no encontrada." });
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      version.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    await db.execute(
      `UPDATE archivos
         SET rutaS3 = ?, tamanoBytes = ?, actualizadoEn = NOW()
       WHERE id = ?`,
      [version.keyS3, version.tamanoBytes, version.archivoId]
    );
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'restauracion', ?, ?, ?, ?)`,
      [
        version.archivoId,
        versionId,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({
          versionRestaurada: version.numeroVersion,
          key: version.keyS3,
        }),
      ]
    );

    return res.json({
      message: `Versión ${version.numeroVersion} restaurada correctamente.`,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al restaurar versión." });
  }
};

// Controller: eliminar archivo definitivamente (solo Admin)
export const eliminarDefinitivamente = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  if (rolId !== ROL_ADMIN) {
    return res
      .status(403)
      .json({ message: "Solo Admin puede eliminar definitivamente." });
  }

  try {
    const [[archivo]] = await db.query(
      "SELECT rutaS3 AS keyS3 FROM archivos WHERE id = ? AND estado = 'eliminado'",
      [archivoId]
    );
    if (!archivo) {
      return res
        .status(404)
        .json({ message: "Archivo no encontrado o no está en papelera." });
    }

    // Eliminar de S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: archivo.keyS3,
      })
    );

    // Eliminar registro de BD
    await db.execute(`DELETE FROM archivos WHERE id = ?`, [archivoId]);

    // Registrar evento
    await db.execute(
      `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, 'borradoDefinitivo', ?, ?, ?, ?)`,
      [
        archivoId,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({ key: archivo.keyS3 }),
      ]
    );

    return res.json({ message: "Eliminado permanentemente del sistema y S3." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al eliminar definitivamente." });
  }
};

export const obtenerArbolArchivos = async (req, res) => {
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;
  const esVistaCompleta = [ROL_ADMIN, ROL_SUPERVISOR].includes(rolId);

  try {
    const [rows] = await db.query(
      `SELECT id, nombreOriginal, extension, tamanioBytes,
              rutaS3, creadoEn
         FROM archivos
        WHERE estado = 'activo'
          ${esVistaCompleta ? "" : "AND subidoPor = ?"}
     ORDER BY rutaS3`,
      esVistaCompleta ? [] : [usuarioId]
    );

    const raiz = [];

    const buscarOCrearCarpeta = (nivel, nombre, rutaAbs) => {
      let nodo = nivel.find((n) => n.tipo === "carpeta" && n.nombre === nombre);
      if (!nodo) {
        nodo = { nombre, ruta: rutaAbs, tipo: "carpeta", hijos: [] };
        nivel.push(nodo);
      }
      return nodo.hijos;
    };

    for (const f of rows) {
      const partes = f.rutaS3.split("/");
      let nivelActual = raiz;
      let rutaAcum = "";

      for (let i = 0; i < partes.length - 1; i++) {
        rutaAcum = rutaAcum ? `${rutaAcum}/${partes[i]}` : partes[i];
        nivelActual = buscarOCrearCarpeta(nivelActual, partes[i], rutaAcum);
      }

      nivelActual.push({
        id: f.id,
        nombre: f.nombreOriginal,
        ruta: f.rutaS3,
        tipo: "archivo",
        extension: f.extension,
        tamanioBytes: f.tamanioBytes,
        creadoEn: f.creadoEn,
      });
    }

    return res.json(raiz);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error interno al obtener árbol de archivos." });
  }
};

export const obtenerDetallesArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[archivo]] = await db.query(
      `SELECT a.id,
       a.nombreOriginal,
       a.extension,
       a.tamanioBytes,
       a.rutaS3,
       a.actualizadoEn,
       u.nombre AS nombreUsuario
         FROM archivos a
    JOIN usuarios u ON u.id = a.subidoPor
        WHERE a.id = ? AND a.estado = 'activo'`,
      [archivoId]
    );

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Si no es admin o supervisor, validar que el usuario sea dueño
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    const [[{ totalVersiones }]] = await conexion.query(
      `SELECT COUNT(*) AS totalVersiones FROM versionesArchivo WHERE archivoId = ?`,
      [archivo.id]
    );

    const ultimaVersion = totalVersiones + 1;

    return res.json({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      extension: archivo.extension,
      tamanioBytes: archivo.tamanioBytes,
      rutaS3: archivo.rutaS3,
      actualizadoEn: archivo.actualizadoEn,
      nombreUsuario: archivo.nombreUsuario,
      ultimaVersion,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error interno al obtener los detalles del archivo.",
    });
  }
};

export const contarVersionesArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[archivo]] = await db.query(
      "SELECT subidoPor FROM archivos WHERE id = ?",
      [archivoId]
    );

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    const [[{ totalVersiones }]] = await db.query(
      `SELECT COUNT(*) AS totalVersiones FROM versionesArchivo WHERE archivoId = ?`,
      [archivoId]
    );

    // La versión activa siempre cuenta como una
    const totalConActual = totalVersiones + 1;

    return res.json({ totalVersiones: totalConActual });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error al contar versiones del archivo." });
  }
};
