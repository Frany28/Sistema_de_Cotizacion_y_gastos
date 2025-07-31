import db from "../config/database.js";
import {
  s3,
  generarUrlPrefirmadaLectura,
  moverArchivoAPapelera,
} from "../utils/s3.js";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

// Roles autorizados
const ROL_ADMIN = 1;
const ROL_SUPERVISOR = 2;

const chunk = (array, size = 1000) => {
  const resultado = [];
  for (let i = 0; i < array.length; i += size) {
    resultado.push(array.slice(i, i + size));
  }
  return resultado;
};

export async function moverObjetoEnS3({ origen, destino }) {
  const bucket = process.env.S3_BUCKET;
  const copySource = encodeURI(`${bucket}/${origen}`);

  // 1) Copiar
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: copySource,
      Key: destino,
      ACL: "private",
    })
  );
  // 2) Borrar original
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: origen,
    })
  );
}

export const sustituirArchivo = async (req, res) => {
  const conexion = await db.getConnection();
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    // 1. Datos del nuevo archivo recibido (vía Multer)
    const { key: nuevaKey, originalname, size: tamanoBytes } = req.file;
    const extension = originalname.split(".").pop();

    // 2. Buscar archivo activo del registro (registroTipo + registroId)
    const [[archivo]] = await conexion.query(
      `SELECT id, grupoArchivoId, rutaS3 AS keyS3, subidoPor, tamanoBytes
         FROM archivos
        WHERE registroTipo = ? AND registroId = ? AND estado = 'activo'`,
      [req.params.registroTipo, req.params.registroId]
    );

    if (!archivo) {
      return res
        .status(404)
        .json({ message: "No hay archivo activo para sustituir." });
    }

    // 3. Verificar permiso de sustitución
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para sustituir este archivo." });
    }

    // 4. Validar cuota de almacenamiento (50MB)
    const [[usuario]] = await conexion.query(
      "SELECT cuotaMb, usoStorageBytes FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    const cuotaBytes = usuario.cuotaMb * 1024 * 1024;
    const nuevoUso =
      usuario.usoStorageBytes - archivo.tamanoBytes + tamanoBytes;

    if (nuevoUso > cuotaBytes) {
      return res
        .status(400)
        .json({ message: "Superas tu cuota de almacenamiento (50MB)." });
    }

    await conexion.beginTransaction();

    // 5. Mover archivo viejo a papelera en S3
    await moverArchivoAPapelera(archivo.keyS3);

    // 6. Marcar el archivo anterior como reemplazado
    await conexion.query(
      `UPDATE archivos SET estado = 'reemplazado', actualizadoEn = NOW() WHERE id = ?`,
      [archivo.id]
    );

    // 7. Obtener la próxima versión dentro del grupo
    const [[{ maxVersion }]] = await conexion.query(
      `SELECT COALESCE(MAX(numeroVersion), 0) AS maxVersion FROM archivos WHERE grupoArchivoId = ?`,
      [archivo.grupoArchivoId]
    );
    const siguienteVersion = maxVersion + 1;

    // 8. Insertar nuevo archivo como nueva versión
    const [resultado] = await conexion.query(
      `INSERT INTO archivos (
         grupoArchivoId, numeroVersion, registroTipo, registroId,
         nombreOriginal, extension, tamanioBytes, rutaS3,
         subidoPor, subidoEn, estado
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'activo')`,
      [
        archivo.grupoArchivoId,
        siguienteVersion,
        req.params.registroTipo,
        req.params.registroId,
        originalname,
        extension,
        tamanoBytes,
        nuevaKey,
        usuarioId,
      ]
    );
    const nuevoArchivoId = resultado.insertId;

    // 9. Actualizar uso de almacenamiento del usuario
    await conexion.query(
      "UPDATE usuarios SET usoStorageBytes = ? WHERE id = ?",
      [nuevoUso, usuarioId]
    );

    // 10. Registrar evento de sustitución
    await conexion.query(
      `INSERT INTO eventosArchivo
         (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'sustitucion', ?, ?, ?, ?)`,
      [
        nuevoArchivoId,
        archivo.id,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({
          anteriorId: archivo.id,
          nuevaKey,
          extension,
          originalname,
          numeroVersion: siguienteVersion,
        }),
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

//────────────────── Restaurar archivo ────────────────
export const restaurarArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  /* 1️⃣  Traer metadatos del archivo que se quiere restaurar */
  const [[archReemplazado]] = await db.query(
    `SELECT *
       FROM archivos
      WHERE id = ? AND estado = 'reemplazado'`,
    [archivoId]
  );
  if (!archReemplazado)
    return res.status(404).json({
      mensaje: "Archivo no encontrado o su estado no es 'reemplazado'.",
    });

  /*  Permisos */
  if (
    ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
    archReemplazado.subidoPor !== usuarioId
  )
    return res
      .status(403)
      .json({ mensaje: "No posees permiso para restaurar este archivo." });

  /*   Verificar que el registro asociado aún existe */
  const destinoPorTipo = {
    facturasGastos: "gastos",
    comprobantesPagos: "solicitudes_pago",
    abonosCXC: "abonos_cuentas",
    firmas: "usuarios",
    cotizacion: "cotizaciones", // legados
    gasto: "gastos",
    solicitudPago: "solicitudes_pago",
  };
  const tablaDestino = destinoPorTipo[archReemplazado.registroTipo];
  if (!tablaDestino)
    return res.status(400).json({
      mensaje: `registroTipo inválido: ${archReemplazado.registroTipo}`,
    });

  const [[registroVivo]] = await db.query(
    `SELECT 1 FROM \`${tablaDestino}\` WHERE id = ? LIMIT 1`,
    [archReemplazado.registroId]
  );
  if (!registroVivo)
    return res
      .status(410)
      .json({ mensaje: "El registro asociado ya no existe." });

  /* 4️⃣  Iniciar transacción */
  const cx = await db.getConnection();
  try {
    await cx.beginTransaction();

    /* 4.1  Bloquear (FOR UPDATE) la versión activa actual —si existe— */
    const [[archActivo]] = await cx.query(
      `SELECT id, rutaS3
         FROM archivos
        WHERE grupoArchivoId = ? AND estado = 'activo' FOR UPDATE`,
      [archReemplazado.grupoArchivoId]
    );

    /* 4.2  Si hay activo, pasarlo a papelera y marcarlo como 'reemplazado' */
    if (archActivo) {
      const rutaPapelera = `papelera/${archActivo.rutaS3}`;
      await moverObjetoEnS3({
        origen: archActivo.rutaS3,
        destino: rutaPapelera,
      });

      await cx.query(
        `UPDATE archivos
            SET estado   = 'reemplazado',
                rutaS3   = ?,
                actualizadoEn = NOW()
          WHERE id = ?`,
        [rutaPapelera, archActivo.id]
      );
    }

    /* 4.3  Sacar la versión a restaurar de la papelera y dejarla 'activa' */
    const rutaDestino = archReemplazado.rutaS3.replace(/^papelera\//, "");
    await moverObjetoEnS3({
      origen: archReemplazado.rutaS3,
      destino: rutaDestino,
    });

    await cx.query(
      `UPDATE archivos
          SET estado   = 'activo',
              rutaS3   = ?,
              actualizadoEn = NOW()
        WHERE id = ?`,
      [rutaDestino, archReemplazado.id]
    );

    /* 4.4  Registrar dos eventos de auditoría */
    const userAgent = req.get("User-Agent");
    const ip = req.ip;

    if (archActivo) {
      await cx.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, usuarioId, ip, userAgent, detalles)
         VALUES (?, 'versionReemplazada', ?, ?, ?, ?)`,
        [
          archActivo.id,
          usuarioId,
          ip,
          userAgent,
          JSON.stringify({ nuevaRuta: `papelera/${archActivo.rutaS3}` }),
        ]
      );
    }

    await cx.query(
      `INSERT INTO eventosArchivo
        (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, 'restauracion', ?, ?, ?, ?)`,
      [
        archReemplazado.id,
        usuarioId,
        ip,
        userAgent,
        JSON.stringify({ rutaRestaurada: rutaDestino }),
      ]
    );

    await cx.commit();
    return res.json({ mensaje: "Archivo restaurado correctamente." });
  } catch (err) {
    await cx.rollback();
    console.error("Error al restaurar archivo:", err);
    return res
      .status(500)
      .json({ mensaje: "Error interno al restaurar archivo." });
  } finally {
    cx.release();
  }
};

export const listarHistorialVersiones = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  const conexion = await db.getConnection();

  try {
    // 1. Obtener grupo del archivo actual
    const [[archivo]] = await conexion.query(
      `SELECT grupoArchivoId, subidoPor FROM archivos WHERE id = ?`,
      [archivoId]
    );

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // 2. Validar acceso
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({
        message: "No tienes permiso para ver este historial.",
      });
    }

    // 3. Consultar todas las versiones del grupo (sin filtrar por estado)
    const [versiones] = await conexion.query(
      `SELECT a.id, a.numeroVersion, a.estado, a.nombreOriginal, a.extension,
              a.tamanioBytes, a.rutaS3, a.creadoEn AS subidoEn,
              a.subidoPor, u.nombre AS nombreUsuario
         FROM archivos a
         JOIN usuarios u ON u.id = a.subidoPor
        WHERE a.grupoArchivoId = ?
        ORDER BY a.numeroVersion DESC`,
      [archivo.grupoArchivoId]
    );

    // 4. Agregar URLs prefirmadas
    const versionesConUrl = await Promise.all(
      versiones.map(async (v) => {
        const urlTemporal = await generarUrlPrefirmadaLectura(v.rutaS3);
        return { ...v, urlTemporal };
      })
    );

    return res.json(versionesConUrl);
  } catch (error) {
    console.error("Error al listar historial de versiones:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener historial de versiones." });
  } finally {
    conexion.release();
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

export const restaurarVersion = async (req, res) => {
  const conexion = await db.getConnection();
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const versionId = Number(req.params.versionId);

    // 1. Obtener la versión a restaurar
    const [[version]] = await conexion.query(
      `SELECT id, grupoArchivoId, nombreOriginal, extension, tamanioBytes,
              rutaS3 AS keyS3, subidoPor, registroTipo, registroId
         FROM archivos
        WHERE id = ?`,
      [versionId]
    );

    if (!version) {
      return res.status(404).json({ message: "Versión no encontrada." });
    }

    // 2. Validar permisos
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      version.subidoPor !== usuarioId
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para restaurar esta versión." });
    }

    // 3. Validar cuota
    const [[usuario]] = await conexion.query(
      "SELECT cuotaMb, usoStorageBytes FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    const cuotaBytes = usuario.cuotaMb * 1024 * 1024;
    const nuevoUso = usuario.usoStorageBytes + version.tamanioBytes;

    if (nuevoUso > cuotaBytes) {
      return res
        .status(400)
        .json({ message: "Superas la cuota de almacenamiento al restaurar." });
    }

    await conexion.beginTransaction();

    // 4. Buscar versión activa actual del grupo
    const [[activoActual]] = await conexion.query(
      `SELECT id, rutaS3 FROM archivos
        WHERE grupoArchivoId = ? AND estado = 'activo'`,
      [version.grupoArchivoId]
    );

    if (activoActual) {
      // Mover activo a papelera en S3
      const nuevaRutaPapelera = `papelera/${activoActual.rutaS3}`;
      await moverObjetoEnS3({
        origen: activoActual.rutaS3,
        destino: nuevaRutaPapelera,
      });

      // Actualizar archivo activo
      await conexion.query(
        `UPDATE archivos
          SET estado = 'reemplazado',
        rutaS3 = ?,
        actualizadoEn = NOW()
         WHERE id = ?`,
        [nuevaRutaPapelera, activoActual.id]
      );

      // Evento
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, usuarioId, detalles, ip, userAgent)
         VALUES (?, 'versionReemplazada', ?, ?, ?, ?)`,
        [
          activoActual.id,
          usuarioId,
          JSON.stringify({ nuevaRuta: nuevaRutaPapelera }),
          req.ip,
          req.get("User-Agent"),
        ]
      );
    }

    // 5. Clonar archivo en S3 con nueva clave (ruta única)
    const nuevaRuta = `restaurados/${Date.now()}_${version.keyS3
      .split("/")
      .pop()}`;
    await moverObjetoEnS3({
      origen: version.keyS3,
      destino: nuevaRuta,
    });

    // 6. Obtener nuevo número de versión
    const [[{ maxVersion }]] = await conexion.query(
      `SELECT MAX(numeroVersion) AS maxVersion FROM archivos WHERE grupoArchivoId = ?`,
      [version.grupoArchivoId]
    );
    const siguienteVersion = maxVersion + 1;

    // 7. Insertar nueva versión activa
    const [resultado] = await conexion.query(
      `INSERT INTO archivos (
         grupoArchivoId, numeroVersion, registroTipo, registroId,
         nombreOriginal, extension, tamanioBytes, rutaS3,
         subidoPor, subidoEn, estado
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'activo')`,
      [
        version.grupoArchivoId,
        siguienteVersion,
        version.registroTipo,
        version.registroId,
        version.nombreOriginal,
        version.extension,
        version.tamanioBytes,
        nuevaRuta,
        usuarioId,
      ]
    );
    const nuevoArchivoId = resultado.insertId;

    // 8. Actualizar almacenamiento
    await conexion.query(
      `UPDATE usuarios SET usoStorageBytes = ? WHERE id = ?`,
      [nuevoUso, usuarioId]
    );

    // 9. Registrar evento
    await conexion.query(
      `INSERT INTO eventosArchivo
         (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
       VALUES (?, ?, 'restauracion', ?, ?, ?, ?)`,
      [
        nuevoArchivoId,
        versionId,
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify({
          grupoArchivoId: version.grupoArchivoId,
          restauradoDesde: version.numeroVersion,
          nuevaVersion: siguienteVersion,
          nuevaRuta,
        }),
      ]
    );

    await conexion.commit();
    return res.json({ message: "Versión restaurada correctamente." });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al restaurar versión:", error);
    return res
      .status(500)
      .json({ message: "Error al restaurar versión del archivo." });
  } finally {
    conexion.release();
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

  const conexion = await db.getConnection();

  try {
    const [[archivo]] = await conexion.query(
      `SELECT a.id,
          a.nombreOriginal,
          a.extension,
          a.tamanioBytes,
          a.numeroVersion,
          a.rutaS3,
          a.estado,
          a.actualizadoEn,
          a.subidoPor,
          a.grupoArchivoId,
          u.nombre AS nombreUsuario
     FROM archivos a
     JOIN usuarios u ON u.id = a.subidoPor
    WHERE a.id = ? AND a.estado IN ('activo', 'eliminado', 'reemplazado')`,
      [archivoId]
    );

    if (!archivo) {
      await conexion.release();
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Si no es admin o supervisor, validar que el usuario sea dueño
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      await conexion.release();
      return res.status(403).json({ message: "Acceso denegado." });
    }

    await conexion.release();
    return res.json({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      extension: archivo.extension,
      tamanioBytes: archivo.tamanioBytes,
      ultimaVersion: archivo.numeroVersion,
      rutaS3: archivo.rutaS3,
      estado: archivo.estado,
      actualizadoEn: archivo.actualizadoEn,
      nombreUsuario: archivo.nombreUsuario,
      grupoArchivoId: archivo.grupoArchivoId,
    });
  } catch (error) {
    await conexion.release();
    console.error("Error en obtenerDetallesArchivo:", error);
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
    // Obtener datos del archivo
    const [[archivo]] = await db.query(
      `SELECT subidoPor, numeroVersion
         FROM archivos
        WHERE id = ? AND estado != 'eliminado'`,
      [archivoId]
    );

    if (!archivo) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Control de acceso
    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      archivo.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    return res.json({ totalVersiones: archivo.numeroVersion });
  } catch (error) {
    console.error("Error en contarVersionesArchivo:", error);
    return res.status(500).json({
      message: "Error al contar versiones del archivo.",
    });
  }
};

export const listarArchivosEliminados = async (req, res) => {
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    let queryBase = `
      SELECT a.id, a.nombreOriginal, a.extension, a.tamanioBytes, a.rutaS3,
             a.actualizadoEn, a.subidoPor, u.nombre AS nombreUsuario
        FROM archivos a
        JOIN usuarios u ON u.id = a.subidoPor
       WHERE (a.estado = 'eliminado' OR a.estado = 'reemplazado')
         AND a.rutaS3 LIKE 'papelera/%'
    `;

    const params = [];
    if (![1, 2].includes(rolId)) {
      queryBase += " AND a.subidoPor = ?";
      params.push(usuarioId);
    }

    const [archivos] = await db.query(queryBase, params);

    const archivosConUrl = await Promise.all(
      archivos.map(async (archivo) => {
        const urlTemporal = await generarUrlPrefirmadaLectura(archivo.rutaS3);
        return { ...archivo, urlTemporal };
      })
    );

    res.json(archivosConUrl);
  } catch (error) {
    console.error("Error al listar archivos eliminados:", error);
    res.status(500).json({ message: "Error al obtener archivos en papelera." });
  }
};

export const listarVersionesPorGrupo = async (req, res) => {
  const grupoArchivoId = Number(req.params.grupoArchivoId);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  const conexion = await db.getConnection();

  try {
    // Validar que el grupo exista y permisos si lo deseas
    const [[grupo]] = await conexion.query(
      `SELECT creadoPor FROM archivoGrupos WHERE id = ?`,
      [grupoArchivoId]
    );

    if (!grupo) {
      return res
        .status(404)
        .json({ message: "Grupo de archivo no encontrado." });
    }

    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      grupo.creadoPor !== usuarioId
    ) {
      return res
        .status(403)
        .json({ message: "Acceso denegado al grupo de archivos." });
    }

    const [versiones] = await conexion.query(
      `SELECT a.id, a.numeroVersion, a.estado, a.nombreOriginal, a.extension,
          a.tamanioBytes, a.rutaS3, a.creadoEn AS subidoEn, a.subidoPor, u.nombre AS nombreUsuario
     FROM archivos a
     JOIN usuarios u ON u.id = a.subidoPor
    WHERE a.grupoArchivoId = ?
    ORDER BY a.numeroVersion DESC`,
      [grupoArchivoId]
    );

    const versionesConUrl = await Promise.all(
      versiones.map(async (v) => {
        const urlTemporal = await generarUrlPrefirmadaLectura(v.rutaS3);
        return { ...v, urlTemporal };
      })
    );

    res.json(versionesConUrl);
  } catch (error) {
    console.error("Error al listar versiones por grupo:", error);
    res.status(500).json({ message: "Error al obtener historial por grupo." });
  } finally {
    conexion.release();
  }
};

export const eliminarDefinitivoArchivo = async (req, res) => {
  const archivoId = Number(req.params.id);
  const { id: usuarioId, rol_id: rolId } = req.user;

  /* Permisos */
  const [[meta]] = await db.query(
    `SELECT rutaS3, subidoPor FROM archivos
      WHERE id=? AND estado IN ('eliminado','reemplazado')`,
    [archivoId]
  );
  if (!meta) return res.status(404).json({ message: "No está en papelera." });
  if (
    ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
    meta.subidoPor !== usuarioId
  )
    return res.status(403).json({ message: "Sin permiso." });

  /* Rutas físicas (archivo + versiones) */
  const [versiones] = await db.query(
    `SELECT rutaS3 FROM versionesArchivo WHERE archivoId=?`,
    [archivoId]
  );
  const rutas = [meta.rutaS3, ...versiones.map((v) => v.rutaS3)];

  /*  Borrar en S3 (aquí hacemos rollback manual si algo falla) */
  try {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET,
        Delete: {
          Objects: rutas.map((r) => ({
            Key: r.startsWith("papelera/") ? r : `papelera/${r}`,
          })),
        },
      })
    );
  } catch (err) {
    console.error(err);
    return res.status(502).json({ message: "Error al borrar en S3." });
  }

  /*  Transacción BD */
  const cx = await db.getConnection();
  try {
    await cx.beginTransaction();

    // 3.1  Restar almacenamiento
    await cx.query(
      `
      UPDATE usuarios
         SET usoStorageBytes = usoStorageBytes - (
           SELECT COALESCE(SUM(tamanioBytes),0) FROM versionesArchivo WHERE archivoId=?
         )
       WHERE id = ?`,
      [archivoId, meta.subidoPor]
    );

    // 3.2  Elimina versiones
    await cx.query(`DELETE FROM versionesArchivo WHERE archivoId=?`, [
      archivoId,
    ]);

    // 3.3  Marca el archivo como purgado (no lo borres, así la FK sigue viva)
    await cx.query(
      `
      UPDATE archivos
         SET estado='borrado', rutaS3=NULL
       WHERE id=?`,
      [archivoId]
    );

    // 3.4  Audita
    await cx.query(
      `
      INSERT INTO eventosArchivo
        (archivoId, accion, usuarioId, ip, userAgent, detalles)
      VALUES (?,?,?,?,?, JSON_OBJECT('rutasEliminadas',?))`,
      [
        archivoId,
        "borradoDefinitivo",
        usuarioId,
        req.ip,
        req.get("User-Agent"),
        JSON.stringify(rutas),
      ]
    );

    await cx.commit();
    res.json({ message: "Archivo purgado y auditado correctamente." });
  } catch (e) {
    await cx.rollback();
    console.error(e);
    res.status(500).json({ message: "Error al actualizar la base de datos." });
  } finally {
    cx.release();
  }
};

export const purgarPapelera = async (req, res) => {
  /* 0️⃣  Permisos */
  const { id: usuarioId, rol_id: rolId } = req.user;
  if (![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId)) {
    return res
      .status(403)
      .json({ mensaje: "No posees permiso para vaciar la papelera." });
  }

  /* 1️⃣  Todos los archivos en papelera */
  const [archivos] = await db.query(`
    SELECT id, rutaS3, tamanioBytes, subidoPor
      FROM archivos
     WHERE estado IN ('eliminado','reemplazado')
  `);

  if (archivos.length === 0)
    return res.json({ mensaje: "La papelera ya está vacía." });

  const archivoIds = archivos.map((a) => a.id);
  const rutasPrincipales = archivos.map((a) => a.rutaS3).filter(Boolean);

  /* 2️⃣  Versiones */
  const [versiones] = await db.query(
    `SELECT archivoId, rutaS3, tamanioBytes FROM versionesArchivo
      WHERE archivoId IN (?)`,
    [archivoIds]
  );

  const rutasTotales = [...rutasPrincipales, ...versiones.map((v) => v.rutaS3)];

  /* 3️⃣  Borrar en S3 (lotes ≤ 1000) */
  try {
    for (const lote of chunk(rutasTotales, 1000)) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.S3_BUCKET,
          Delete: {
            Objects: lote.map((k) => ({
              Key: k.startsWith("papelera/") ? k : `papelera/${k}`,
            })),
          },
        })
      );
    }
  } catch (err) {
    console.error("Error al borrar en S3:", err);
    return res.status(502).json({ mensaje: "Fallo al eliminar en S3." });
  }

  /* 4️⃣  Transacción BD */
  const cx = await db.getConnection();
  try {
    await cx.beginTransaction();

    /* 4.1  Restar almacenamiento a cada usuario */
    const bytesPorUsuario = {};
    const sumar = (uid, b) =>
      (bytesPorUsuario[uid] = (bytesPorUsuario[uid] || 0) + b);

    archivos.forEach((a) => sumar(a.subidoPor, a.tamanioBytes));
    versiones.forEach((v) => {
      const { subidoPor } = archivos.find((a) => a.id === v.archivoId);
      sumar(subidoPor, v.tamanioBytes);
    });

    for (const [uid, bytes] of Object.entries(bytesPorUsuario)) {
      await cx.query(
        `UPDATE usuarios
            SET usoStorageBytes = GREATEST(usoStorageBytes - ?, 0)
          WHERE id = ?`,
        [bytes, uid]
      );
    }

    /* 4.2  Evento borradoDefinitivo */
    const eventoValores = archivos.map((a) => [
      a.id,
      "borradoDefinitivo",
      usuarioId,
      req.ip,
      req.get("User-Agent"),
      JSON.stringify({ rutasEliminadas: rutasTotales }),
    ]);
    await cx.query(
      `INSERT INTO eventosArchivo
         (archivoId, accion, usuarioId, ip, userAgent, detalles)
       VALUES ?`,
      [eventoValores]
    );

    /* 4.3  Eliminar versiones y marcar archivos */
    await cx.query(`DELETE FROM versionesArchivo WHERE archivoId IN (?)`, [
      archivoIds,
    ]);
    await cx.query(
      `UPDATE archivos
          SET rutaS3 = NULL,
              estado  = 'borrado',          -- mantiene la FK
              eliminadoEn = IFNULL(eliminadoEn, NOW())
        WHERE id IN (?)`,
      [archivoIds]
    );

    await cx.commit();
    res.json({
      mensaje: `Se vació la papelera. ${archivoIds.length} archivo(s) eliminados permanentemente.`,
    });
  } catch (e) {
    await cx.rollback();
    console.error(e);
    res.status(500).json({
      mensaje: "Error al actualizar la base de datos durante la purga.",
    });
  } finally {
    cx.release();
  }
};
