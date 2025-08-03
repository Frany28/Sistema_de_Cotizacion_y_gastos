// controllers/usuarios.controller.js
import db from "../config/database.js";
import bcrypt from "bcrypt";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  s3,
  generarUrlPrefirmadaLectura,
  moverArchivoAPapelera,
} from "../utils/s3.js";
import { obtenerOcrearGrupoFirma } from "../utils/gruposArchivos.js";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

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

    // 4) Si hay firma, registrar TODO el circuito de archivos
    if (firmaKey) {
      const grupoId = await obtenerOcrearGrupoFirma(
        conexion,
        usuarioId,
        req.user.id
      );

      /* 4.1) tabla archivos */
      const [aRes] = await conexion.query(
        `INSERT INTO archivos
       (registroTipo, registroId, grupoArchivoId,
        nombreOriginal, extension, tamanioBytes,
        rutaS3, numeroVersion, estado,
        subidoPor, creadoEn, actualizadoEn)
     VALUES ('firmas', ?, ?, ?, ?, ?, ?, 1, 'activo', ?, NOW(), NOW())`,
        [
          usuarioId,
          grupoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaS3,
          req.user.id,
        ]
      );
      const archivoId = aRes.insertId;

      /* 4.2) tabla versionesArchivo (versión 1) */
      const [vRes] = await conexion.query(
        `INSERT INTO versionesArchivo
       (archivoId, numeroVersion, nombreOriginal, extension,
        tamanioBytes, rutaS3, subidoPor)
     VALUES (?, 1, ?, ?, ?, ?, ?)`,
        [
          archivoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaS3,
          req.user.id,
        ]
      );
      const versionId = vRes.insertId;

      /* 4.3) auditoría */
      await conexion.query(
        `INSERT INTO eventosArchivo
       (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
     VALUES (?, ?, 'subida', ?, ?, ?, ?)`,
        [
          archivoId,
          versionId,
          req.user.id,
          req.ip,
          req.get("user-agent"),
          JSON.stringify({ ruta: rutaS3, nombre: nombreOriginal, extension }),
        ]
      );

      /* 4.4) cuota del dueño */
      await conexion.query(
        `UPDATE usuarios
        SET usoStorageBytes = usoStorageBytes + ?
      WHERE id = ?`,
        [tamanioBytes, usuarioId]
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

export const actualizarUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  let firmaKeyNueva = null;

  try {
    await conexion.beginTransaction();

    const { id } = req.params;
    const { nombre, email, password, rol_id, estado } = req.body;
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const tamanioBytes = req.file?.size ?? null;

    // 1) Obtener hash actual (para comparar password)
    const [[{ password: hashActual } = {}] = []] = await conexion.query(
      `SELECT password FROM usuarios WHERE id = ?`,
      [id]
    );
    if (!hashActual) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2) Validaciones de campos que lleguen
    if (email !== undefined) {
      if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
        return res
          .status(400)
          .json({ message: "El email tiene un formato inválido" });
      }
    }
    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "La contraseña debe tener al menos 6 caracteres",
        });
      }
      const coincide = await bcrypt.compare(password, hashActual);
      if (coincide) {
        return res.status(400).json({
          message: "La nueva contraseña debe ser diferente a la actual.",
        });
      }
    }
    if (rol_id !== undefined && !rol_id) {
      return res
        .status(400)
        .json({ message: "Si envías rol_id, debe ser un valor válido" });
    }

    // 3) Construir UPDATE dinámico
    const campos = [];
    const valores = [];

    if (nombre !== undefined) {
      campos.push("nombre = ?");
      valores.push(nombre.trim());
    }
    if (email !== undefined) {
      campos.push("email = ?");
      valores.push(email.trim());
    }
    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, 10);
      campos.push("password = ?");
      valores.push(hashed);
    }
    if (rol_id !== undefined) {
      campos.push("rol_id = ?");
      valores.push(rol_id);
    }
    if (estado !== undefined) {
      campos.push("estado = ?");
      valores.push(estado);
    }
    if (firmaKey) {
      campos.push("firma = ?");
      valores.push(firmaKey);
      firmaKeyNueva = firmaKey;
    }

    // Si no hay nada para actualizar
    if (campos.length === 0) {
      return res
        .status(400)
        .json({ message: "No se enviaron campos para actualizar." });
    }

    valores.push(id);
    await conexion.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`,
      valores
    );

    // 4) Si subió nueva firma, procesar versión y audit trail
    if (firmaKey) {
      const grupoId = await obtenerOcrearGrupoFirma(conexion, id, req.user.id);

      const [[{ maxVer }]] = await conexion.query(
        `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
           FROM archivos
          WHERE registroTipo='firmas' AND registroId = ?`,
        [id]
      );
      const numeroVersion = maxVer + 1;

      // Insertar nuevo archivo
      const [aRes] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId, grupoArchivoId,
            nombreOriginal, extension, tamanioBytes,
            rutaS3, numeroVersion, estado,
            subidoPor, creadoEn, actualizadoEn)
         VALUES ('firmas', ?, ?, ?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        [
          id,
          grupoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          firmaKey,
          numeroVersion,
          req.user.id,
        ]
      );
      const archivoId = aRes.insertId;

      // Snapshot de versión
      const [vRes] = await conexion.query(
        `INSERT INTO versionesArchivo
           (archivoId, numeroVersion, nombreOriginal, extension,
            tamanioBytes, rutaS3, subidoPor)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          archivoId,
          numeroVersion,
          nombreOriginal,
          extension,
          tamanioBytes,
          firmaKey,
          req.user.id,
        ]
      );
      const versionId = vRes.insertId;

      // Evento de sustitución
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
         VALUES (?, ?, 'sustituido', ?, ?, ?, ?)`,
        [
          archivoId,
          versionId,
          req.user.id,
          req.ip,
          req.get("user-agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
      );

      // Reemplazar versión anterior
      const [anteriores] = await conexion.query(
        `SELECT id, rutaS3
           FROM archivos
          WHERE registroTipo='firmas'
            AND registroId = ? AND id <> ? AND estado='activo'
          ORDER BY numeroVersion DESC
          LIMIT 1`,
        [id, archivoId]
      );
      if (anteriores.length) {
        const antId = anteriores[0].id;
        const nuevaRuta = await moverArchivoAPapelera(
          anteriores[0].rutaS3,
          "firmas",
          id
        );
        await conexion.query(
          `UPDATE archivos SET estado='reemplazado', rutaS3=? WHERE id=?`,
          [nuevaRuta, antId]
        );
        await conexion.query(
          `INSERT INTO eventosArchivo
             (archivoId, accion, usuarioId, ip, userAgent, detalles)
           VALUES (?, 'eliminacion', ?, ?, ?, ?)`,
          [
            antId,
            req.user.id,
            req.ip,
            req.get("user-agent"),
            JSON.stringify({ motivo: "Sustitución de firma", nuevaRuta }),
          ]
        );
      }

      // Aumentar cuota
      await conexion.query(
        `UPDATE usuarios
            SET usoStorageBytes = usoStorageBytes + ?
          WHERE id = ?`,
        [tamanioBytes, id]
      );
    }

    await conexion.commit();
    res.json({ id, firma: firmaKey });
  } catch (err) {
    await conexion.rollback();

    // Si subió la firma y hubo error, borrar de S3
    if (firmaKeyNueva) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: firmaKeyNueva,
          })
        );
      } catch (e) {
        console.error("Error borrando firma tras rollback:", e);
      }
    }

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

    // 3) Mover cada archivo a papelera
    for (const archivo of archivos) {
      // 3.1) Mover a papelera en S3
      const nuevaClave = await moverArchivoAPapelera(
        archivo.rutaS3,
        "firmas",
        id
      );

      // 3.2) Actualizar registro archivo
      await conexion.query(
        `UPDATE archivos
            SET estado = 'eliminado',
                rutaS3 = ?
          WHERE id = ?`,
        [nuevaClave, archivo.id]
      );

      // 3.3) Insertar evento de auditoría
      await conexion.query(
        `INSERT INTO eventosArchivo
             (archivoId, versionId, accion, usuarioId, ip, userAgent, detalles)
           VALUES (?, NULL,'eliminacion' , ?, ?, ?, ?)`,
        [
          archivo.id,
          req.user?.id || null,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            motivo: "Eliminación de usuario",
            nuevaRuta: nuevaClave,
          }),
        ]
      );
    }

    // 4) Borrar usuario
    await conexion.query(`DELETE FROM usuarios WHERE id = ?`, [id]);

    await conexion.commit();
    res.json({
      message: "Usuario eliminado y archivos movidos a papelera correctamente.",
    });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno al eliminar usuario." });
  } finally {
    conexion.release();
  }
};
