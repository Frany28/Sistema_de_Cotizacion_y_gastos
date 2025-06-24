// controllers/usuarios.controller.js
// Versión corregida – incluye tamanioBytes y coincide número de columnas/valores
// Se conserva camelCase y comentarios en español

import db from "../config/database.js";
import { s3 } from "../config/s3.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import bcrypt from "bcrypt";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

/*******************************************
 * Función auxiliar: genera los parámetros
 * para el INSERT en la tabla "archivos".
 *******************************************/
function buildInsertArchivo({ registroTipo, registroId, file, usuarioId }) {
  const nombreOriginal = file.originalname;
  const extension = nombreOriginal.split(".").pop();
  const rutaS3 = file.key;
  const tamanioBytes = file.size;

  /* Orden exacto de columnas según la tabla:
     registroTipo, registroId,
     nombreOriginal, extension, tamanioBytes,
     rutaS3, estado, subidoPor, creadoEn, actualizadoEn
  */
  const columnas = `registroTipo, registroId, nombreOriginal, extension, tamanioBytes, rutaS3, estado, subidoPor, creadoEn, actualizadoEn`;
  const placeholders = `?,?,?,?,?,?,?,?,NOW(),NOW()`;
  const valores = [
    registroTipo,
    registroId,
    nombreOriginal,
    extension,
    tamanioBytes,
    rutaS3,
    "activo",
    usuarioId,
  ];

  return { columnas, placeholders, valores };
}

/*******************************************
 * Crear usuario (con carga opcional de firma)
 *******************************************/
export const crearUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    /* 1) Datos de entrada */
    const { nombre, email, password, rol_id, estado = "activo" } = req.body;
    const file = req.file ?? null; // file puede ser undefined
    const hashed = await bcrypt.hash(password, 10);

    /* 2) Insertar en usuarios */
    const [uResult] = await conexion.query(
      `INSERT INTO usuarios
         (nombre, email, password, rol_id, estado, firma, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [nombre.trim(), email.trim(), hashed, rol_id, estado, file?.key ?? null]
    );
    const usuarioId = uResult.insertId;

    /* 3) Generar código interno */
    const codigo = `USR${String(usuarioId).padStart(4, "0")}`;
    await conexion.query(`UPDATE usuarios SET codigo = ? WHERE id = ?`, [
      codigo,
      usuarioId,
    ]);

    /* 4) Si se subió una firma, registrar en archivos y eventos */
    if (file) {
      /* 4.1) Tabla archivos */
      const { columnas, placeholders, valores } = buildInsertArchivo({
        registroTipo: "firmas",
        registroId: usuarioId,
        file,
        usuarioId: req.user.id,
      });

      const [aResult] = await conexion.query(
        `INSERT INTO archivos (${columnas}) VALUES (${placeholders})`,
        valores
      );
      const archivoId = aResult.insertId;

      /* 4.2) Tabla eventosArchivo */
      const detalleEvento = JSON.stringify({
        ruta: file.key,
        nombre: file.originalname,
        extension: file.originalname.split(".").pop(),
      });

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
         VALUES (?, NULL, 'subida', ?, ?, ?, ?)`,
        [archivoId, req.user.id, req.ip, req.get("User-Agent"), detalleEvento]
      );
    }

    await conexion.commit();
    res.status(201).json({ id: usuarioId, firma: file?.key ?? null });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al crear usuario:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  } finally {
    conexion.release();
  }
};

/*******************************************
 * Actualizar usuario (datos + nueva firma)
 *******************************************/
export const actualizarUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const { id } = req.params;
    const { nombre, email, password, rol_id, estado } = req.body;
    const file = req.file ?? null;

    /* 1) Construir SET dinámico */
    const campos = [];
    const valores = [];
    if (nombre) campos.push("nombre = ?"), valores.push(nombre.trim());
    if (email) campos.push("email = ?"), valores.push(email.trim());
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      campos.push("password = ?"), valores.push(hashed);
    }
    if (rol_id) campos.push("rol_id = ?"), valores.push(rol_id);
    if (estado) campos.push("estado = ?"), valores.push(estado);
    if (file) {
      campos.push("firma = ?");
      valores.push(file.key);
    }
    valores.push(id);

    /* 2) Ejecutar UPDATE */
    if (campos.length) {
      await conexion.query(
        `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`,
        valores
      );
    }

    /* 3) Si hay nueva firma, registrar archivo + evento */
    if (file) {
      const { columnas, placeholders, valores } = buildInsertArchivo({
        registroTipo: "firmas",
        registroId: id,
        file,
        usuarioId: req.user.id,
      });

      const [aResult] = await conexion.query(
        `INSERT INTO archivos (${columnas}) VALUES (${placeholders})`,
        valores
      );
      const archivoId = aResult.insertId;

      const detalleEvento = JSON.stringify({
        ruta: file.key,
        nombre: file.originalname,
        extension: file.originalname.split(".").pop(),
      });

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
         VALUES (?, NULL, 'subida', ?, ?, ?, ?)`,
        [archivoId, req.user.id, req.ip, req.get("User-Agent"), detalleEvento]
      );
    }

    await conexion.commit();
    res.json({ id, firma: file?.key ?? null });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  } finally {
    conexion.release();
  }
};

/*******************************************
 * Obtener todos los usuarios
 *******************************************/
export const obtenerUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.codigo, u.nombre, u.email, u.estado, u.created_at, r.nombre AS rol
         FROM usuarios u
         LEFT JOIN roles r ON u.rol_id = r.id
         ORDER BY u.id DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

/*******************************************
 * Obtener usuario por ID (con URL firma)
 *******************************************/
export const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [[user]] = await db.query(
      `SELECT id, codigo, nombre, email, estado, rol_id, created_at
         FROM usuarios
        WHERE id = ?`,
      [id]
    );
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const [files] = await db.query(
      `SELECT rutaS3
         FROM archivos
        WHERE registroTipo = 'firmas'
          AND registroId   = ?
          AND estado       = 'activo'
        ORDER BY id DESC
        LIMIT 1`,
      [id]
    );
    const urlFirma = files.length
      ? generarUrlPrefirmadaLectura(files[0].rutaS3)
      : null;
    res.json({ ...user, urlFirma });
  } catch (error) {
    console.error("Error al obtener usuario por ID:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
};

/*******************************************
 * Eliminar usuario y sus firmas
 *******************************************/
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    /* 1) Verificar */
    const [[usuario]] = await conexion.query(
      `SELECT id FROM usuarios WHERE id = ?`,
      [id]
    );
    if (!usuario) {
      await conexion.rollback();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    /* 2) Traer archivos de firma */
    const [archivos] = await conexion.query(
      `SELECT id, rutaS3 FROM archivos WHERE registroTipo = 'firmas' AND registroId = ?`,
      [id]
    );

    for (const archivo of archivos) {
      /* 2.1) Borrar de S3 */
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: archivo.rutaS3,
        })
      );

      /* 2.2) Borrar auditoría y registros */
      await conexion.query(`DELETE FROM eventosArchivo WHERE archivoId = ?`, [
        archivo.id,
      ]);
      await conexion.query(`DELETE FROM archivos WHERE id = ?`, [archivo.id]);
    }

    /* 3) Borrar usuario */
    await conexion.query(`DELETE FROM usuarios WHERE id = ?`, [id]);

    await conexion.commit();
    res.json({
      message: "Usuario y archivos asociados eliminados correctamente",
    });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno al eliminar usuario" });
  } finally {
    conexion.release();
  }
};
