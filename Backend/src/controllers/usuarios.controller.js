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

/*─────────────────────────────────────────────────────────────
  Crear usuario (y firma opcional en `firmas/`)
──────────────────────────────────────────────────────────────*/
// ✅ Reemplaza SOLO esta función dentro de controllers/usuarios.controller.js

export const crearUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  let firmaKeyNueva = null;

  try {
    await conexion.beginTransaction();

    // ── 1) Normalizo/valido entradas
    const nombre = (req.body?.nombre || "").trim();
    const email = (req.body?.email || "").trim();
    const passwordPlano = req.body?.password || "";
    const rolId = req.body?.rol_id;
    const estado = (req.body?.estado || "activo").trim();

    // Campos opcionales que podrían existir en la BD
    const numero = (req.body?.numero ?? "").toString().trim();
    const telefono = (req.body?.telefono ?? "").toString().trim();

    const errores = [];
    const regexEmail = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!nombre) errores.push("El nombre es requerido.");
    if (!email) errores.push("El email es requerido.");
    else if (!regexEmail.test(email))
      errores.push("El email no tiene un formato válido.");
    if (!passwordPlano) errores.push("La contraseña es requerida.");
    else if (passwordPlano.length < 6)
      errores.push("La contraseña debe tener al menos 6 caracteres.");
    if (!rolId) errores.push("El rol es requerido.");

    if (errores.length) {
      await conexion.rollback();
      return res.status(400).json({ message: "Error de validación.", errores });
    }

    // ── 2) Verificación de duplicados (nombre, email, y si existen: numero/telefono)
    const camposDuplicados = {
      nombre: false,
      email: false,
      numero: false,
      telefono: false,
    };

    // nombre (case-insensitive)
    const [[dupNombre]] = await conexion.query(
      `SELECT id FROM usuarios WHERE LOWER(nombre) = LOWER(?) LIMIT 1`,
      [nombre]
    );
    if (dupNombre) camposDuplicados.nombre = true;

    // email (case-insensitive)
    const [[dupEmail]] = await conexion.query(
      `SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email]
    );
    if (dupEmail) camposDuplicados.email = true;

    // Detecto columnas opcionales
    const [colNumero] = await conexion.query(
      `SHOW COLUMNS FROM usuarios LIKE 'numero'`
    );
    const [colTelefono] = await conexion.query(
      `SHOW COLUMNS FROM usuarios LIKE 'telefono'`
    );

    if (colNumero.length && numero) {
      const [[dupNumero]] = await conexion.query(
        `SELECT id FROM usuarios WHERE numero = ? LIMIT 1`,
        [numero]
      );
      if (dupNumero) camposDuplicados.numero = true;
    }

    if (colTelefono.length && telefono) {
      const [[dupTelefono]] = await conexion.query(
        `SELECT id FROM usuarios WHERE telefono = ? LIMIT 1`,
        [telefono]
      );
      if (dupTelefono) camposDuplicados.telefono = true;
    }

    if (
      camposDuplicados.nombre ||
      camposDuplicados.email ||
      camposDuplicados.numero ||
      camposDuplicados.telefono
    ) {
      await conexion.rollback();
      const mensajes = [];
      if (camposDuplicados.nombre) mensajes.push("El nombre ya existe.");
      if (camposDuplicados.email) mensajes.push("El correo ya existe.");
      if (camposDuplicados.numero) mensajes.push("El número ya existe.");
      if (camposDuplicados.telefono) mensajes.push("El teléfono ya existe.");
      return res.status(409).json({
        message: mensajes.join(" "),
        campos: camposDuplicados,
      });
    }

    // ── 3) Preparar datos de firma (middleware uploadFirma.single('firma'))
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const tamanioBytes = req.file?.size ?? null;
    firmaKeyNueva = firmaKey;

    // ── 4) Insertar usuario base
    const hashPassword = await bcrypt.hash(passwordPlano, 10);
    const usuarioCreadorId = req.user.id;

    const [resultadoUsuario] = await conexion.query(
      `INSERT INTO usuarios
         (nombre, email, password, rol_id, estado, firma, creadoPor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, email, hashPassword, rolId, estado, firmaKey, usuarioCreadorId]
    );

    const nuevoUsuarioId = resultadoUsuario.insertId;

    // Código USR0001
    const codigoUsuario = `USR${String(nuevoUsuarioId).padStart(4, "0")}`;
    await conexion.query(`UPDATE usuarios SET codigo = ? WHERE id = ?`, [
      codigoUsuario,
      nuevoUsuarioId,
    ]);

    // ── 5) Registrar archivo/versión/evento si llegó firma
    if (firmaKey) {
      const grupoArchivoId = await obtenerOcrearGrupoFirma(
        conexion,
        nuevoUsuarioId,
        usuarioCreadorId
      );

      const [resArchivo] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId, grupoArchivoId,
            nombreOriginal, extension, tamanioBytes,
            rutaS3, numeroVersion, estado,
            subidoPor, creadoEn, actualizadoEn)
         VALUES ('firmas', ?, ?, ?, ?, ?, ?, 1, 'activo', ?, NOW(), NOW())`,
        [
          nuevoUsuarioId,
          grupoArchivoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          firmaKey,
          usuarioCreadorId,
        ]
      );
      const archivoId = resArchivo.insertId;

      await conexion.query(
        `INSERT INTO versionesArchivo
           (archivoId, numeroVersion, nombreOriginal, extension,
            tamanioBytes, rutaS3, subidoPor, creadoEn)
         VALUES (?, 1, ?, ?, ?, ?, ?, NOW())`,
        [
          archivoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          firmaKey,
          usuarioCreadorId,
        ]
      );

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, creadoPor, fechaHora, ip, userAgent, detalles)
         VALUES (?, 'subidaArchivo', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          usuarioCreadorId,
          req.ip,
          req.get("user-agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
      );

      // actualizar cuota del dueño del archivo
      await conexion.query(
        `UPDATE usuarios SET usoStorageBytes = usoStorageBytes + ? WHERE id = ?`,
        [tamanioBytes, nuevoUsuarioId]
      );
    }

    await conexion.commit();
    return res.status(201).json({ id: nuevoUsuarioId, firma: firmaKey });
  } catch (error) {
    await conexion.rollback();

    // Limpieza de archivo subido si algo falla después de subir
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

    console.error("Error al crear usuario:", error);
    // Si el error viene por unique index en BD, estandarizo la respuesta
    const texto = String(error?.message || "");
    if (/duplicate entry/i.test(texto) || error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Registro duplicado: ya existe un usuario con esos datos.",
      });
    }
    return res.status(500).json({ error: "Error al crear usuario" });
  } finally {
    conexion.release();
  }
};

/*─────────────────────────────────────────────────────────────
  Actualizar usuario (incluye reemplazo de firma)
──────────────────────────────────────────────────────────────*/
export const actualizarUsuario = async (req, res) => {
  const conexion = await db.getConnection();
  let firmaKeyNueva = null;

  try {
    await conexion.beginTransaction();

    const { id } = req.params;
    const { nombre, email, password, rol_id, estado, cuotaMb } = req.body;

    // Datos de archivo (si viene nueva firma)
    const firmaKey = req.file?.key ?? null;
    const nombreOriginal = req.file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop() ?? null;
    const tamanioBytes = req.file?.size ?? null;

    // ✅ Verificar usuario (traer también rol_id, cuotaMb y usoStorageBytes)
    const [[filaUsuario]] = await conexion.query(
      `SELECT id, password, rol_id, cuotaMb, usoStorageBytes
         FROM usuarios
        WHERE id = ?`,
      [id]
    );

    if (!filaUsuario) {
      await conexion.rollback();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // ─────────────────────────────────────────────
    // Validaciones base
    // ─────────────────────────────────────────────
    if (email !== undefined) {
      if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
        await conexion.rollback();
        return res
          .status(400)
          .json({ message: "El email tiene un formato inválido" });
      }
    }

    if (password !== undefined) {
      if (password.length < 6) {
        await conexion.rollback();
        return res
          .status(400)
          .json({ message: "La contraseña debe tener al menos 6 caracteres" });
      }

      const coincide = await bcrypt.compare(password, filaUsuario.password);
      if (coincide) {
        await conexion.rollback();
        return res.status(400).json({
          message: "La nueva contraseña debe ser diferente a la actual.",
        });
      }
    }

    if (rol_id !== undefined && !rol_id) {
      await conexion.rollback();
      return res
        .status(400)
        .json({ message: "Si envías rol_id, debe ser un valor válido" });
    }

    // ─────────────────────────────────────────────
    // ✅ Cuota (MB) — unificada en editarUsuario
    // ─────────────────────────────────────────────
    let cuotaMbNormalizada = undefined;

    // Rol final: si no mandan rol_id, usamos el rol actual
    const rolIdFinal =
      rol_id !== undefined ? Number(rol_id) : Number(filaUsuario.rol_id);

    if (cuotaMb !== undefined) {
      const texto = cuotaMb === null ? null : String(cuotaMb).trim();

      // Si lo dejan vacío, no tocamos la cuota
      if (texto === "") {
        cuotaMbNormalizada = undefined;
      } else if (
        String(texto).toLowerCase() === "null" ||
        String(texto).toLowerCase() === "ilimitado"
      ) {
        cuotaMbNormalizada = null; // ilimitado
      } else {
        const numero = Number(texto);
        const esValido = Number.isFinite(numero) && numero >= 0;

        if (!esValido) {
          await conexion.rollback();
          return res.status(400).json({
            message: "La cuota debe ser un número >= 0 o 'ilimitado'.",
          });
        }

        cuotaMbNormalizada = numero;
      }
    }

    // ✅ Regla: Admin siempre ilimitado (aunque NO envíen rol_id)
    if (rolIdFinal === 1) {
      cuotaMbNormalizada = null;
    }

    // ✅ Validación: si la cuota se está seteando (y no es null), no puede ser menor al uso actual
    if (cuotaMbNormalizada !== undefined && cuotaMbNormalizada !== null) {
      const cuotaBytes = Number(cuotaMbNormalizada) * 1024 * 1024;
      const usoActualBytes = Number(filaUsuario.usoStorageBytes || 0);

      if (usoActualBytes > cuotaBytes) {
        await conexion.rollback();
        return res.status(400).json({
          message:
            "La cuota no puede ser menor al almacenamiento ya usado por el usuario.",
        });
      }
    }

    // ─────────────────────────────────────────────
    // Build de actualización dinámica
    // ─────────────────────────────────────────────
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
      const nuevoHash = await bcrypt.hash(password, 10);
      campos.push("password = ?");
      valores.push(nuevoHash);
    }

    if (rol_id !== undefined) {
      campos.push("rol_id = ?");
      valores.push(rol_id);
    }

    if (estado !== undefined) {
      campos.push("estado = ?");
      valores.push(estado);
    }

    // ✅ Guardar cuota solo si se decidió cambiarla
    if (cuotaMbNormalizada !== undefined) {
      campos.push("cuotaMb = ?");
      valores.push(cuotaMbNormalizada);
    }

    if (firmaKey) {
      campos.push("firma = ?");
      valores.push(firmaKey);
      firmaKeyNueva = firmaKey; // por si falla luego
    }

    if (campos.length === 0) {
      await conexion.rollback();
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

    // ─────────────────────────────────────────────
    // Si hay nueva firma: archivos/versiones/eventos + papelera + usoStorage
    // ─────────────────────────────────────────────
    if (firmaKey) {
      const grupoArchivoId = await obtenerOcrearGrupoFirma(
        conexion,
        id,
        req.user.id
      );

      const [[{ maxVer }]] = await conexion.query(
        `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
           FROM archivos
          WHERE registroTipo='firmas' AND registroId = ?`,
        [id]
      );
      const numeroVersion = (maxVer || 0) + 1;

      const [resArchivo] = await conexion.query(
        `INSERT INTO archivos
           (registroTipo, registroId, grupoArchivoId,
            nombreOriginal, extension, tamanioBytes,
            rutaS3, numeroVersion, estado,
            subidoPor, creadoEn, actualizadoEn)
         VALUES ('firmas', ?, ?, ?, ?, ?, ?, ?, 'activo', ?, NOW(), NOW())`,
        [
          id,
          grupoArchivoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          firmaKey,
          numeroVersion,
          req.user.id,
        ]
      );
      const archivoId = resArchivo.insertId;

      await conexion.query(
        `INSERT INTO versionesArchivo
           (archivoId, numeroVersion, nombreOriginal, extension,
            tamanioBytes, rutaS3, subidoPor, creadoEn)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
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

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, creadoPor, fechaHora, ip, userAgent, detalles)
         VALUES (?, 'sustitucionArchivo', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          req.user.id,
          req.ip,
          req.get("user-agent"),
          JSON.stringify({ ruta: firmaKey, nombre: nombreOriginal, extension }),
        ]
      );

      const [anteriorActiva] = await conexion.query(
        `SELECT id, rutaS3
           FROM archivos
          WHERE registroTipo='firmas'
            AND registroId = ?
            AND estado = 'activo'
            AND id <> ?
          ORDER BY numeroVersion DESC
          LIMIT 1`,
        [id, archivoId]
      );

      if (anteriorActiva.length) {
        const archivoAnteriorId = anteriorActiva[0].id;
        const rutaAnterior = anteriorActiva[0].rutaS3;

        const nuevaRutaPapelera = await moverArchivoAPapelera(rutaAnterior);

        await conexion.query(
          `UPDATE archivos SET estado='reemplazado', rutaS3=? WHERE id=?`,
          [nuevaRutaPapelera, archivoAnteriorId]
        );

        await conexion.query(
          `INSERT INTO eventosArchivo
             (archivoId, accion, creadoPor, fechaHora, ip, userAgent, detalles)
           VALUES (?, 'eliminacionArchivo', ?, NOW(), ?, ?, ?)`,
          [
            archivoAnteriorId,
            req.user.id,
            req.ip,
            req.get("user-agent"),
            JSON.stringify({
              motivo: "Sustitución de firma",
              nuevaRuta: nuevaRutaPapelera,
            }),
          ]
        );
      }

      // Aumentar usoStorageBytes del usuario dueño de la firma (el usuario editado)
      await conexion.query(
        `UPDATE usuarios SET usoStorageBytes = usoStorageBytes + ? WHERE id = ?`,
        [tamanioBytes, id]
      );
    }

    await conexion.commit();
    return res.json({ id, firma: firmaKey || null });
  } catch (error) {
    await conexion.rollback();

    if (firmaKeyNueva) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: firmaKeyNueva,
          })
        );
      } catch (e) {
        console.error("Error borrando firma tras fallo:", e);
      }
    }

    console.error("Error al actualizar usuario:", error);
    return res.status(500).json({ error: "Error al actualizar usuario" });
  } finally {
    conexion.release();
  }
};

/*─────────────────────────────────────────────────────────────
  Listado de usuarios
──────────────────────────────────────────────────────────────*/
export const obtenerUsuarios = async (req, res) => {
  try {
    const [filasUsuarios] = await db.query(`
      SELECT
        u.id,
        u.codigo,
        u.nombre,
        u.email,
        u.estado,
        u.cuotaMb,
        u.usoStorageBytes,
        u.fechaCreacion      AS fechaCreacion,
        u.fechaActualizacion AS fechaActualizacion,
        u.creadoPor,
        u.actualizadoPor,
        r.nombre             AS rol
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.id DESC
    `);
    return res.json(filasUsuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

/*─────────────────────────────────────────────────────────────
  Detalle de usuario (incluye URL prefirmada de firma activa)
──────────────────────────────────────────────────────────────*/
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
          u.cuotaMb              AS cuotaMb,
          u.usoStorageBytes      AS usoStorageBytes,
          u.fechaCreacion        AS fechaCreacion,
          u.fechaActualizacion   AS fechaActualizacion
        FROM usuarios u
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `,
      [id]
    );
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Buscar la firma activa en archivos (registroTipo='firmas')
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

    return res.json({ ...usuario, urlFirma });
  } catch (error) {
    console.error("Error al obtener usuario por ID:", error);
    return res.status(500).json({ message: "Error al obtener usuario" });
  }
};

/*─────────────────────────────────────────────────────────────
  Eliminar usuario (mover firmas a papelera + auditoría)
──────────────────────────────────────────────────────────────*/
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [[usuario]] = await conexion.query(
      `SELECT id FROM usuarios WHERE id = ?`,
      [id]
    );
    if (!usuario) {
      await conexion.rollback();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Recuperar todos los archivos de firmas del usuario
    const [archivosFirma] = await conexion.query(
      `SELECT id, rutaS3 FROM archivos WHERE registroTipo='firmas' AND registroId = ?`,
      [id]
    );

    // Mover cada archivo a papelera en S3 + actualizar BD a estado 'papelera' + evento
    for (const archivo of archivosFirma) {
      const nuevaRutaPapelera = await moverArchivoAPapelera(archivo.rutaS3);

      await conexion.query(
        `UPDATE archivos
            SET estado='papelera',
                rutaS3=?
          WHERE id=?`,
        [nuevaRutaPapelera, archivo.id]
      );

      await conexion.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, creadoPor, fechaHora, ip, userAgent, detalles)
         VALUES (?, 'eliminacionArchivo', ?, NOW(), ?, ?, ?)`,
        [
          archivo.id,
          req.user?.id || null,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            motivo: "Eliminación de usuario",
            nuevaRuta: nuevaRutaPapelera,
          }),
        ]
      );
    }

    // Borrar usuario
    await conexion.query(`DELETE FROM usuarios WHERE id = ?`, [id]);

    await conexion.commit();
    return res.json({
      message: "Usuario eliminado y firmas movidas a papelera correctamente.",
    });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al eliminar usuario:", error);
    return res
      .status(500)
      .json({ message: "Error interno al eliminar usuario." });
  } finally {
    conexion.release();
  }
};
