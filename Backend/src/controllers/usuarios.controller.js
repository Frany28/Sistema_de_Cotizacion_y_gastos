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

// ✅ NUEVO: verificación rápida de duplicados por nombre/email
export const verificarUsuarioDuplicado = async (req, res) => {
  try {
    const nombre = (req.query?.nombre || "").trim();
    const email = (req.query?.email || "").trim();

    if (!nombre && !email) {
      return res.json({
        exists: false,
        campos: { nombre: false, email: false },
      });
    }

    const [[row]] = await db.query(
      `
      SELECT
        MAX(CASE WHEN nombre = ? THEN 1 ELSE 0 END) AS nombreExiste,
        MAX(CASE WHEN email  = ? THEN 1 ELSE 0 END) AS emailExiste
      FROM usuarios
      WHERE (nombre = ? AND ? <> '')
         OR (email  = ? AND ? <> '')
      `,
      [nombre, email, nombre, nombre, email, email]
    );

    const nombreExiste = row?.nombreExiste === 1;
    const emailExiste = row?.emailExiste === 1;

    return res.json({
      exists: nombreExiste || emailExiste,
      campos: { nombre: nombreExiste, email: emailExiste },
    });
  } catch (error) {
    console.error("Error verificarUsuarioDuplicado:", error);
    return res.status(500).json({ message: "Error al verificar duplicados" });
  }
};

// Crear usuario
export const crearUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    const { nombre, email, password, rol_id, estado = "activo" } = req.body;
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const tamanioBytes = req.file?.size ?? null;
    const hashed = await bcrypt.hash(password, 10);

    // (Opcional) Validaciones mínimas
    if (!nombre?.trim())
      return res.status(400).json({ message: "El nombre es obligatorio" });
    if (!email?.trim() || !EMAIL_REGEX.test(email.trim()))
      return res
        .status(400)
        .json({ message: "El email tiene un formato inválido" });
    if (!rol_id)
      return res.status(400).json({ message: "El rol es obligatorio" });

    // Insert
    const usuarioCreador = req.user.id;
    const [uResult] = await conexion.query(
      `INSERT INTO usuarios
         (nombre, email, password, rol_id, estado, firma, creadoPor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        email.trim(),
        hashed,
        rol_id,
        estado,
        firmaKey,
        usuarioCreador,
      ]
    );
    const nuevoUsuarioId = uResult.insertId;

    // Código
    const codigo = `USR${String(nuevoUsuarioId).padStart(4, "0")}`;
    await conexion.query(`UPDATE usuarios SET codigo = ? WHERE id = ?`, [
      codigo,
      nuevoUsuarioId,
    ]);

    // Firma → archivos + auditoría
    if (firmaKey) {
      const grupoId = await obtenerOcrearGrupoFirma(
        conexion,
        nuevoUsuarioId,
        req.user.id
      );

      const [aRes] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId, grupoArchivoId,
            nombreOriginal, extension, tamanioBytes,
            rutaS3, numeroVersion, estado,
            subidoPor, creadoEn, actualizadoEn)
         VALUES ('firmas', ?, ?, ?, ?, ?, ?, 1, 'activo', ?, NOW(), NOW())`,
        [
          nuevoUsuarioId,
          grupoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          firmaKey,
          req.user.id,
        ]
      );
      const archivoId = aRes.insertId;

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
          firmaKey,
          req.user.id,
        ]
      );
      const versionId = vRes.insertId;

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, creadoPor, ip, userAgent, detalles)
         VALUES (?, ?, 'subidaArchivo', ?, ?, ?, ?)`,
        [
          archivoId,
          versionId,
          req.user.id,
          req.ip,
          req.get("user-agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
      );

      await conexion.query(
        `UPDATE usuarios SET usoStorageBytes = usoStorageBytes + ? WHERE id = ?`,
        [tamanioBytes, nuevoUsuarioId]
      );
    }

    await conexion.commit();
    return res.status(201).json({ id: nuevoUsuarioId, firma: firmaKey });
  } catch (err) {
    await conexion.rollback();
    console.error("Error al crear usuario:", err);

    // ✅ Mensajes claros ante duplicados
    if (err?.code === "ER_DUP_ENTRY") {
      const msg = (err.sqlMessage || "").toLowerCase();
      if (msg.includes("email")) {
        return res
          .status(409)
          .json({ message: "El email ya está registrado." });
      }
      if (msg.includes("nombre")) {
        return res
          .status(409)
          .json({ message: "El nombre ya está registrado." });
      }
      return res.status(409).json({ message: "Usuario duplicado." });
    }

    return res.status(500).json({ error: "Error al crear usuario" });
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

    // 1) Obtener hash actual
    const [[{ password: hashActual } = {}] = []] = await conexion.query(
      `SELECT password FROM usuarios WHERE id = ?`,
      [id]
    );
    if (!hashActual) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2) Validaciones mínimas
    if (email !== undefined) {
      if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
        return res
          .status(400)
          .json({ message: "El email tiene un formato inválido" });
      }
    }
    if (password !== undefined) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "La contraseña debe tener al menos 6 caracteres" });
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

    // 3) UPDATE dinámico
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

    if (campos.length === 0) {
      return res
        .status(400)
        .json({ message: "No se enviaron campos para actualizar." });
    }

    campos.push("actualizadoPor = ?");
    valores.push(req.user.id);
    valores.push(id);

    await conexion.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`,
      valores
    );

    // 4) Nueva firma → crear archivo, versión y auditoría
    if (firmaKey) {
      const grupoId = await obtenerOcrearGrupoFirma(conexion, id, req.user.id);

      const [[{ maxVer }]] = await conexion.query(
        `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
           FROM archivos
          WHERE registroTipo='firmas' AND registroId = ?`,
        [id]
      );
      const numeroVersion = maxVer + 1;

      // 4.1) Archivo
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

      // 4.2) Versión
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

      // 4.3) Evento del archivo NUEVO: sustitucionArchivo
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, creadoPor, ip, userAgent, detalles)
         VALUES (?, ?, 'sustitucionArchivo', ?, ?, ?, ?)`,
        [
          archivoId,
          versionId,
          req.user.id,
          req.ip,
          req.get("user-agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
      );

      // 4.4) Marcar anterior como reemplazado y mover a papelera (si existe)
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

        // Estado correcto del archivo anterior
        await conexion.query(
          `UPDATE archivos SET estado='reemplazado', rutaS3=? WHERE id=?`,
          [nuevaRuta, antId]
        );

        // Evento sobre el archivo anterior: eliminacionArchivo (se movió a papelera)
        await conexion.query(
          `INSERT INTO eventosArchivo
             (archivoId, accion, creadoPor, ip, userAgent, detalles)
           VALUES (?, 'eliminacionArchivo', ?, ?, ?, ?)`,
          [
            antId,
            req.user.id,
            req.ip,
            req.get("user-agent"),
            JSON.stringify({ motivo: "Sustitución de firma", nuevaRuta }),
          ]
        );
      }

      // 4.5) Aumentar cuota
      await conexion.query(
        `UPDATE usuarios SET usoStorageBytes = usoStorageBytes + ? WHERE id = ?`,
        [tamanioBytes, id]
      );
    }

    await conexion.commit();
    res.json({ id, firma: firmaKey });
  } catch (err) {
    await conexion.rollback();

    // Si subió la firma y falló, borrar el objeto de S3 para no dejar basura
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
    const [filasUsuarios] = await db.query(`
     SELECT
        u.id,
        u.codigo,
        u.nombre,
        u.email,
        u.estado,
        u.fechaCreacion      AS fechaCreacion,
        u.fechaActualizacion AS fechaActualizacion,
        u.creadoPor,
        u.actualizadoPor,
        r.nombre             AS rol
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id
       ORDER BY u.id DESC
    `);
    res.json(filasUsuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Obtener un usuario por ID (incluye la URL de la firma)
export const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [[usuario]] = await db.query(
      `
      SELECT
        u.id,
        u.codigo,
        u.nombre,
        u.email,
        u.estado,
        u.rol_id               AS rolId,
        r.nombre               AS rol,
        u.fechaCreacion        AS fechaCreacion,
        u.fechaActualizacion   AS fechaActualizacion
      FROM usuarios u
      LEFT JOIN roles r
        ON u.rol_id = r.id
      WHERE u.id = ?
      `,
      [id]
    );
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const [archivos] = await db.query(
      `
      SELECT rutaS3
      FROM archivos
      WHERE registroTipo = 'firmas'
        AND registroId   = ?
        AND estado       = 'activo'
      ORDER BY id DESC
      LIMIT 1
      `,
      [id]
    );
    const urlFirma = archivos.length
      ? await generarUrlPrefirmadaLectura(archivos[0].rutaS3)
      : null;

    res.json({
      ...usuario,
      urlFirma,
    });
  } catch (error) {
    console.error("Error al obtener usuario por ID:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
};

// Eliminar usuario y mover sus firmas a papelera con auditoría
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const usuarioIdEliminar = Number(id);
  const usuarioActorId = Number(req.user?.id || 0);

  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();

    // Validaciones básicas
    if (!usuarioActorId) {
      await conexion.rollback();
      return res.status(401).json({ error: "Sesión no válida." });
    }

    const [[usuario]] = await conexion.query(
      `SELECT id, estado FROM usuarios WHERE id = ?`,
      [usuarioIdEliminar]
    );
    if (!usuario) {
      await conexion.rollback();
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    if (usuarioActorId === usuarioIdEliminar) {
      await conexion.rollback();
      return res
        .status(400)
        .json({ error: "No puedes eliminar tu propio usuario." });
    }
    if (usuario.estado !== "inactivo") {
      await conexion.rollback();
      return res
        .status(400)
        .json({ error: "Solo pueden eliminarse usuarios inactivos." });
    }

    // 1) Traer todos los archivos de firmas del usuario
    const [archivosFirma] = await conexion.query(
      `SELECT id, rutaS3
         FROM archivos
        WHERE registroTipo = 'firmas'
          AND registroId   = ?`,
      [usuarioIdEliminar]
    );

    // 2) Mover cada firma a /papelera/... en S3 y auditar
    for (const archivo of archivosFirma) {
      const nuevaRutaS3 = await moverArchivoAPapelera(archivo.rutaS3); // <= solo 1 parámetro

      // Si el objeto original no existe, moverArchivoAPapelera devuelve null; evitamos romper BD
      if (!nuevaRutaS3) {
        // Dejar constancia del intento fallido
        await conexion.query(
          `INSERT INTO eventosArchivo
             (archivoId, accion, creadoPor, ip, userAgent, detalles)
           VALUES (?, 'eliminacionArchivo', ?, ?, ?, ?)`,
          [
            archivo.id,
            usuarioActorId,
            req.ip || null,
            req.get("user-agent") || null,
            JSON.stringify({
              motivo: "Eliminación de usuario (objeto no encontrado en S3)",
              rutaAnterior: archivo.rutaS3,
            }),
          ]
        );
        continue;
      }

      // Actualizar estado y ruta a papelera
      await conexion.query(
        `UPDATE archivos
            SET estado = 'eliminado',
                rutaS3 = ?,
                actualizadoEn = NOW()
          WHERE id = ?`,
        [nuevaRutaS3, archivo.id]
      );

      // Auditoría del movimiento a papelera
      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, creadoPor, ip, userAgent, detalles)
         VALUES (?, 'eliminacionArchivo', ?, ?, ?, ?)`,
        [
          archivo.id,
          usuarioActorId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            motivo: "Eliminación de usuario",
            nuevaRuta: nuevaRutaS3,
          }),
        ]
      );
    }

    // 3) Romper referencias que apunten al usuario a eliminar (seguridad FK)
    await conexion.query(
      `UPDATE usuarios
          SET creadoPor = ?, actualizadoPor = NULL
        WHERE id = ?`,
      [usuarioActorId, usuarioIdEliminar]
    );
    await conexion.query(
      `UPDATE usuarios
          SET creadoPor = ?,
              actualizadoPor = CASE WHEN actualizadoPor = ? THEN NULL ELSE actualizadoPor END
        WHERE creadoPor = ? OR actualizadoPor = ?`,
      [usuarioActorId, usuarioIdEliminar, usuarioIdEliminar, usuarioIdEliminar]
    );

    // 4) Eliminar usuario
    const [resultado] = await conexion.query(
      `DELETE FROM usuarios WHERE id = ?`,
      [usuarioIdEliminar]
    );
    if (!resultado.affectedRows) {
      throw new Error("No se pudo eliminar el usuario (sin filas afectadas).");
    }

    await conexion.commit();
    return res.json({
      message: "Usuario eliminado y firmas movidas a papelera correctamente.",
      idEliminado: usuarioIdEliminar,
    });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al eliminar usuario:", error);
    return res.status(500).json({
      error: "Error interno al eliminar usuario.",
      detalle: error.message,
    });
  } finally {
    conexion.release();
  }
};
