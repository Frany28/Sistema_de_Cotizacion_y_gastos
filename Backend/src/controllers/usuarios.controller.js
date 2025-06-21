// controllers/usuarios.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import bcrypt from "bcrypt";

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
           (registroTipo, registroId,
            nombreOriginal, extension, rutaS3,
            estado, subidoPor, creadoEn, actualizadoEn)
         VALUES (?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        [
          "firmas", // registroTipo
          usuarioId, // registroId
          nombreOriginal, // nombreOriginal
          extension, // extension
          firmaKey, // rutaS3
          req.user.id, // subidoPor (admin que sube)
        ]
      );
      const archivoId = aResult.insertId;

      // 4.2) Registrar evento de auditoría
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, tipoEvento, usuarioId,
            fecha, ip, userAgent, metadata)
         VALUES (?, NULL, 'subida', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          req.user.id,
          req.ip,
          req.get("User-Agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
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

// Actualizar usuario (puede cambiar datos básicos y firma)
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
    await conexion.query(
      `UPDATE usuarios
         SET ${campos.join(", ")}
       WHERE id = ?`,
      valores
    );

    // 2) Si sube nueva firma, registrar en archivos y evento
    if (firmaKey) {
      const [aResult] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId,
            nombreOriginal, extension, rutaS3,
            estado, subidoPor, creadoEn, actualizadoEn)
         VALUES (?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        ["firmas", id, nombreOriginal, extension, firmaKey, req.user.id]
      );
      const archivoId = aResult.insertId;

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, tipoEvento, usuarioId,
            fecha, ip, userAgent, metadata)
         VALUES (?, NULL, 'actualización', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          req.user.id,
          req.ip,
          req.get("User-Agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
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

// Eliminar usuario
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(`DELETE FROM usuarios WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno al eliminar usuario" });
  }
};
