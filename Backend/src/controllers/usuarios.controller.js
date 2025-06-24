// controllers/usuarios.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import bcrypt from "bcrypt";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../utils/s3.js";

// Crear usuario (incluye registro de firma en S3, tabla archivos y eventosArchivo)
export const crearUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    // 1) Datos de entrada
    const { nombre, email, password, rol_id, estado = "activo" } = req.body;
    const firmaKey = req.file?.key ?? null; // key S3
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const hashed = await bcrypt.hash(password, 10);
    const tamanioBytes = req.file?.size ?? null;
    const rutaS3 = firmaKey;

    // 2) Insertar en usuarios
    const [uResult] = await conexion.query(
      `INSERT INTO usuarios
         (nombre, email, password, rol_id, estado, firma, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [nombre.trim(), email.trim(), hashed, rol_id, estado, firmaKey]
    );
    const usuarioId = uResult.insertId;

    // 3) Generar y guardar código de usuario
    const codigo = `USR${String(usuarioId).padStart(4, "0")}`;
    await conexion.query(
      `UPDATE usuarios
         SET codigo = ?
       WHERE id = ?`,
      [codigo, usuarioId]
    );

    // 4) Si hay firma, registrar en archivos y en eventosArchivo
    if (firmaKey) {
      // 4.1) Insertar metadatos en archivos
      const [aResult] = await conexion.query(
        `INSERT INTO archivos
      (registroTipo, registroId, nombreOriginal, extension, tamanioBytes,
      rutaS3, estado, subidoPor, creadoEn, actualizadoEn)
      VALUES (?, ?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        [
          "firmas",
          usuarioId,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaS3,
          req.user.id,
        ]
      );
      const archivoId = aResult.insertId;

      // 4.2) Registrar evento de auditoría
      const detalleEvento = JSON.stringify({
        ruta: firmaKey,
        nombre: nombreOriginal,
        extension,
      });
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
         VALUES (?, NULL, 'subida', ?, ?, ?, ?)`,
        [archivoId, req.user.id, req.ip, req.get("User-Agent"), detalleEvento]
      );
    }

    await conexion.commit();
    res.status(201).json({ id: usuarioId, firma: firmaKey });
  } catch (err) {
    await conexion.rollback();
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  } finally {
    conexion.release();
  }
};

// Actualizar usuario (puede cambiar datos básicos y subir nueva firma)
export const actualizarUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const { id } = req.params;
    const { nombre, email, password, rol_id, estado } = req.body;
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;

    // 1) Preparar campos dinámicos
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
    if (firmaKey) {
      campos.push("firma = ?");
      valores.push(firmaKey);
    }
    valores.push(id);

    // 2) Ejecutar actualización de usuario
    await conexion.query(
      `UPDATE usuarios
         SET ${campos.join(", ")}
       WHERE id = ?`,
      valores
    );

    // 3) Si sube nueva firma, registrar en archivos y evento
    if (firmaKey) {
      const [aResult] = await conexion.query(
        `INSERT INTO archivos
        (registroTipo, registroId, nombreOriginal, extension, tamanioBytes,
        rutaS3, estado, subidoPor, creadoEn, actualizadoEn)
        VALUES (?, ?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        [
          "firmas",
          id,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaS3,
          req.user.id,
        ]
      );
      const archivoId = aResult.insertId;

      const detalleEvento = JSON.stringify({
        ruta: firmaKey,
        nombre: nombreOriginal,
        extension,
      });
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
         VALUES (?, NULL, 'subida', ?, ?, ?, ?)`,
        [archivoId, req.user.id, req.ip, req.get("User-Agent"), detalleEvento]
      );
    }

    await conexion.commit();
    res.json({ id, firma: firmaKey });
  } catch (err) {
    await conexion.rollback();
    console.error("Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  } finally {
    conexion.release();
  }
};

// Obtener todos los usuarios (incluye código y rol)
export const obtenerUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.codigo, u.nombre, u.email, u.estado, u.created_at, r.nombre AS rol
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.id DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Obtener un usuario por ID (incluye la URL de la firma)
export const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;
  try {
    // 1) Datos básicos del usuario
    const [[user]] = await db.query(
      `SELECT id, codigo, nombre, email, estado, rol_id, created_at
         FROM usuarios
        WHERE id = ?`,
      [id]
    );
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    // 2) Obtener la última firma activa
    const [files] = await db.query(
      `SELECT rutaS3
         FROM archivos
        WHERE registroTipo = 'firmas'
          AND registroId = ?
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

// Eliminar usuario y archivos/eventos asociados
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    // 1) Verificar existencia
    const [[usuario]] = await conexion.query(
      `SELECT id FROM usuarios WHERE id = ?`,
      [id]
    );
    if (!usuario) {
      await conexion.rollback();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2) Recuperar archivos de firma asociados
    const [archivos] = await conexion.query(
      `SELECT id, rutaS3 
         FROM archivos 
        WHERE registroTipo = ? 
          AND registroId   = ?`,
      ["firmas", id]
    );

    // 3) Eliminar cada archivo de S3 y sus registros
    for (const archivo of archivos) {
      // 3.1) Borrar de S3
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: archivo.rutaS3,
        })
      );
      // 3.2) Borrar eventos de auditoría
      await conexion.query(`DELETE FROM eventosArchivo WHERE archivoId = ?`, [
        archivo.id,
      ]);
      // 3.3) Borrar registro en archivos
      await conexion.query(`DELETE FROM archivos WHERE id = ?`, [archivo.id]);
    }

    // 4) Borrar usuario
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
