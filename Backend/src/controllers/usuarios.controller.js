// controllers/usuarios.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import bcrypt from "bcrypt";

// Crear usuario (ahora con firma y código)
// controllers/usuarios.controller.js
export const crearUsuario = async (req, res) => {
  // Obtenemos conexión y arrancamos transacción
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const { nombre, email, password, rol_id, estado = "activo" } = req.body;
    // esta es la key S3 (no cambia)
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const hashed = await bcrypt.hash(password, 10);

    // 1) Insertamos en usuarios (incluye firmaKey como referencia S3)
    const [uResult] = await conexion.query(
      `INSERT INTO usuarios 
         (nombre, email, password, rol_id, estado, firma, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [nombre.trim(), email.trim(), hashed, rol_id, estado, firmaKey]
    );
    const usuarioId = uResult.insertId;

    // 2) Generamos y guardamos código
    const codigo = `USR${String(usuarioId).padStart(4, "0")}`;
    await conexion.query(`UPDATE usuarios SET codigo = ? WHERE id = ?`, [
      codigo,
      usuarioId,
    ]);

    // 3) Si existe firma, registramos el archivo en la tabla archivos
    if (firmaKey) {
      const [aResult] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId,
            nombreOriginal, extension, ruta,
            estado, usuarioId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        [
          "firmas", // nuevo registroTipo
          usuarioId, // id del usuario creado
          nombreOriginal, // nombre original del archivo
          extension, // ej. 'png'
          firmaKey, // clave S3 exacta
          req.user.id, // admin que subió la firma
        ]
      );
      const archivoId = aResult.insertId;

      // 4) Registramos evento de auditoría en eventosArchivo
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
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  } finally {
    conexion.release();
  }
};

export const actualizarUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const { id } = req.params;
    const { nombre, email, password, rol_id, estado } = req.body;
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const campos = [],
      valores = [];

    if (nombre) {
      campos.push("nombre = ?");
      valores.push(nombre.trim());
    }
    if (email) {
      campos.push("email = ?");
      valores.push(email.trim());
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      campos.push("password = ?");
      valores.push(hashed);
    }
    if (rol_id) {
      campos.push("rol_id = ?");
      valores.push(rol_id);
    }
    if (estado) {
      campos.push("estado = ?");
      valores.push(estado);
    }
    if (firmaKey) {
      campos.push("firma = ?");
      valores.push(firmaKey);
    }
    valores.push(id);

    // 1) Actualizamos usuario
    await conexion.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`,
      valores
    );

    // 2) Si hay nueva firma, registramos en archivos + evento
    if (firmaKey) {
      const [aResult] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId,
            nombreOriginal, extension, ruta,
            estado, usuarioId, createdAt, updatedAt)
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
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  } finally {
    conexion.release();
  }
};

// Obtener todos los usuarios (incluye código)
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

// Obtener un usuario por ID (incluye código y firma)
export const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  // 1) Traemos datos básicos del usuario
  const [[user]] = await db.query(
    `SELECT id, codigo, nombre, email, estado, rol_id, created_at
     FROM usuarios
     WHERE id = ?`,
    [id]
  );
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  // 2) Buscamos su firma en archivos (última activa)
  const [files] = await db.query(
    `SELECT ruta
     FROM archivos
     WHERE registroTipo = 'firmas'
       AND registroId = ?
       AND estado = 'activo'
     ORDER BY id DESC
     LIMIT 1`,
    [id]
  );
  const urlFirma = files.length
    ? generarUrlPrefirmadaLectura(files[0].ruta)
    : null;

  res.json({ ...user, urlFirma });
};

// Actualizar usuario (puede cambiar contraseña, firma y rol/estado)

// Eliminar usuario
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno al eliminar usuario" });
  }
};
