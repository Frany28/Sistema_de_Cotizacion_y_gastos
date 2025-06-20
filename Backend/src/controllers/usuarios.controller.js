// controllers/usuarios.controller.js
import db from "../config/database.js";
import { generarUrlPrefirmadaLectura } from "../utils/s3.js";
import bcrypt from "bcrypt";

// Crear usuario (ahora con firma y código)
// controllers/usuarios.controller.js
export const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol_id, estado = "activo" } = req.body;
    const firma = req.file ? req.file.key : null;
    const hashed = await bcrypt.hash(password, 10);

    const adminId = req.usuario?.id || null; // quien crea al usuario

    // 1. Insertar en usuarios
    const [result] = await db.query(
      `INSERT INTO usuarios
       (nombre, email, password, rol_id, estado, firma, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [nombre.trim(), email.trim(), hashed, rol_id, estado, firma]
    );

    const usuarioId = result.insertId;

    // 2. Generar código único
    const codigo = `USR${String(usuarioId).padStart(4, "0")}`;
    await db.query("UPDATE usuarios SET codigo = ? WHERE id = ?", [
      codigo,
      usuarioId,
    ]);

    // 3. Si se subió firma → insertar en archivos + evento
    if (req.file) {
      const archivoRuta = req.file.key;
      const nombreOriginal = req.file.originalname;
      const extension = path.extname(nombreOriginal).substring(1);

      const [resArchivo] = await db.query(
        `INSERT INTO archivos
         (registroTipo, registroId, nombreOriginal, extension, rutaS3, subidoPor, creadoEn, actualizadoEn)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        ["firmas", usuarioId, nombreOriginal, extension, archivoRuta, adminId]
      );

      const archivoId = resArchivo.insertId;

      await db.query(
        `INSERT INTO eventosArchivo
         (archivoId, accion, usuarioId, fechaHora, ip, userAgent, detalles)
         VALUES (?, 'subida', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          adminId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            nombre: nombreOriginal,
            extension,
            ruta: archivoRuta,
          }),
        ]
      );
    }

    res.status(201).json({ id: usuarioId, firma });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol_id, estado } = req.body;

    const firma = req.file ? req.file.key : null;

    const campos = [];
    const valores = [];

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
    if (firma) {
      campos.push("firma = ?");
      valores.push(firma);
    }

    valores.push(id);

    await db.query(
      `UPDATE usuarios
         SET ${campos.join(", ")}
       WHERE id = ?`,
      valores
    );

    res.json({ id, firma });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
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
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.codigo, u.nombre, u.email, u.estado, u.rol_id, u.created_at, u.firma,
              r.nombre AS rol
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = rows[0];
    let urlFirma = null;
    if (user.firma) {
      urlFirma = generarUrlPrefirmadaLectura(user.firma);
    }
    res.json({
      ...user,
      urlFirma,
    });
  } catch (error) {
    console.error("Error al obtener usuario por ID:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
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
