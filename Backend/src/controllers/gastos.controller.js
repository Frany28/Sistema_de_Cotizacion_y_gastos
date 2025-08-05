// controllers/gastos.controller.js
import db from "../config/database.js";
import {
  generarUrlPrefirmadaLectura,
  s3,
  moverArchivoAPapelera,
} from "../utils/s3.js";
import { obtenerOcrearGrupoFactura } from "../utils/gruposArchivos.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import cacheMemoria from "../utils/cacheMemoria.js";

// controllers/gastos.controller.js
export const getGastos = async (req, res) => {
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 5;
  const offset = (page - 1) * limit;
  const q = (req.query.search || "").trim();

  const claveCache = `gastos_${page}_${limit}_${q}`;
  const respuestaEnCache = cacheMemoria.get(claveCache);
  if (respuestaEnCache) return res.json(respuestaEnCache);

  try {
    // 1) TOTAL filtrado
    const [[{ total }]] = await db.query(
      q
        ? `SELECT COUNT(*) AS total
            FROM gastos g
            LEFT JOIN proveedores p ON p.id = g.proveedor_id
            WHERE g.codigo        LIKE ? OR
            p.nombre        LIKE ? OR
            g.concepto_pago LIKE ?`
        : `SELECT COUNT(*) AS total FROM gastos`,
      q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []
    );

    // 2) LISTA paginada filtrada
    const [gastos] = await db.query(
      `
      SELECT g.id,
      g.codigo,
        g.fecha,
        g.total,
        g.estado,
        g.motivo_rechazo,
        g.tipo_gasto_id,                 
        tg.nombre        AS tipo_gasto,  
        p.nombre         AS proveedor,
        s.nombre         AS sucursal,
        g.concepto_pago,
        g.descripcion, 
        g.subtotal,
        g.impuesto,
        g.moneda,
        g.porcentaje_iva, 
        g.tasa_cambio,
        g.cotizacion_id,
        g.documento
        FROM gastos g
        LEFT JOIN proveedores p ON p.id = g.proveedor_id
        LEFT JOIN sucursales  s ON s.id = g.sucursal_id
        LEFT JOIN tipos_gasto tg ON tg.id = g.tipo_gasto_id
      ${
        q
          ? `WHERE g.codigo        LIKE ? OR
            p.nombre        LIKE ? OR
            g.concepto_pago LIKE ?`
          : ""
      }
      ORDER BY g.fecha DESC, g.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      q ? [`%${q}%`, `%${q}%`, `%${q}%`] : []
    );
    cacheMemoria.set(claveCache, { data: gastos, total, page, limit });
    res.json({ data: gastos, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error interno" });
  }
};

export const obtenerUrlComprobante = async (req, res) => {
  const { id } = req.params;
  const claveCache = `gasto_${id}`;
  const enCache = cacheMemoria.get(claveCache);

  if (enCache) return res.json(enCache);

  // 1) Buscar la key que guardaste en la BD
  const [[fila]] = await db.query(
    "SELECT documento AS keyS3 FROM gastos WHERE id = ?",
    [id]
  );

  if (!fila || !fila.keyS3) {
    return res
      .status(404)
      .json({ message: "Este gasto no tiene un comprobante adjunto" });
  }
  const url = await generarUrlPrefirmadaLectura(fila.keyS3, 300);
  const respuesta = { url };
  cacheMemoria.set(claveCache, respuesta);

  res.json(respuesta);
};

export const updateGasto = async (req, res) => {
  const { id } = req.params;
  let claveS3Nueva = null;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    const [[gastoExistente]] = await conexion.query(
      "SELECT * FROM gastos WHERE id = ?",
      [id]
    );
    if (!gastoExistente) {
      await conexion.rollback();
      return res.status(404).json({ message: "Gasto no encontrado" });
    }

    if (gastoExistente.estado === "aprobado") {
      await conexion.rollback();
      return res
        .status(403)
        .json({ message: "No puedes editar un gasto aprobado." });
    }

    const {
      proveedor_id,
      concepto_pago,
      tipo_gasto_id,
      descripcion,
      subtotal,
      porcentaje_iva,
      fecha,
      sucursal_id,
      cotizacion_id,
      moneda,
      tasa_cambio,
      estado,
      motivo_rechazo,
    } = req.body;

    const subtotalNum = parseFloat(subtotal);
    const ivaNum = parseFloat(porcentaje_iva);
    const impuesto = parseFloat(((subtotalNum * ivaNum) / 100).toFixed(2));
    const total = parseFloat((subtotalNum + impuesto).toFixed(2));

    const estadosPermitidos = ["pendiente", "rechazado"];
    let nuevoEstado =
      gastoExistente.estado === "rechazado"
        ? "pendiente"
        : gastoExistente.estado;
    if (estado && estadosPermitidos.includes(estado)) nuevoEstado = estado;

    let motivoRechazoFinal =
      nuevoEstado === "rechazado" ? motivo_rechazo : null;
    if (
      nuevoEstado === "rechazado" &&
      (!motivo_rechazo || motivo_rechazo.trim() === "")
    ) {
      await conexion.rollback();
      return res
        .status(400)
        .json({ message: "Debes indicar el motivo del rechazo." });
    }

    let tasaCambioFinal =
      moneda === "VES"
        ? isNaN(parseFloat(tasa_cambio))
          ? (await conexion.rollback(),
            res
              .status(400)
              .json({ message: "Tasa de cambio inválida para VES." }))
          : tasa_cambio
        : null;

    const documentoNuevo = req.file ? req.file.key : undefined;

    await conexion.query(
      `
      UPDATE gastos SET 
        proveedor_id = ?, concepto_pago = ?, tipo_gasto_id = ?, descripcion = ?, subtotal = ?, 
        porcentaje_iva = ?, impuesto = ?, total = ?, fecha = ?, sucursal_id = ?, cotizacion_id = ?, 
        moneda = ?, tasa_cambio = ?, estado = ?, motivo_rechazo = ?, 
        ${documentoNuevo ? "documento = ?," : ""} updated_at = NOW()
      WHERE id = ?`,
      [
        proveedor_id,
        concepto_pago,
        tipo_gasto_id,
        descripcion,
        subtotalNum,
        ivaNum,
        impuesto,
        total,
        fecha,
        sucursal_id,
        cotizacion_id,
        moneda,
        tasaCambioFinal,
        nuevoEstado,
        motivoRechazoFinal,
        ...(documentoNuevo ? [documentoNuevo] : []),
        id,
      ]
    );

    if (documentoNuevo) {
      claveS3Nueva = documentoNuevo;

      /* ---------- 1. Mover (y registrar) el archivo anterior ---------- */
      if (gastoExistente.documento) {
        const rutaPapelera = await moverArchivoAPapelera(
          gastoExistente.documento,
          "facturasGastos",
          id
        );

        /* 1.1  Marcar archivo activo → reemplazado y cambiar su ruta */
        await conexion.query(
          `UPDATE archivos
          SET estado = 'reemplazado',
              rutaS3 = ?
        WHERE registroTipo = 'facturasGastos'
          AND registroId   = ?
          AND estado       = 'activo'`,
          [rutaPapelera, id]
        );

        /* 1.2  Evento de eliminación (para ese archivo anterior) */
        const [antArchivo] = await conexion.query(
          `SELECT id
         FROM archivos
        WHERE registroTipo = 'facturasGastos'
          AND registroId   = ?
          AND estado       = 'reemplazado'
        ORDER BY id DESC
        LIMIT 1`,
          [id]
        );

        if (antArchivo.length) {
          await conexion.query(
            `INSERT INTO eventosArchivo
             (archivoId, accion, usuarioId,
              fechaHora, ip, userAgent, detalles)
         VALUES (?, 'eliminacion', ?, NOW(), ?, ?, ?)`,
            [
              antArchivo[0].id,
              req.user?.id || null,
              req.ip || null,
              req.get("user-agent") || null,
              JSON.stringify({
                motivo: "Sustitución de la factura al editar gasto",
                nuevaRuta: rutaPapelera,
              }),
            ]
          );
        }
      }

      /* ---------- 2. Alta del nuevo archivo (con versión) ---------- */

      /* 2.1  Grupo */
      const grupoId = await obtenerOcrearGrupoFactura(
        conexion,
        id,
        req.user?.id || null
      );

      /* 2.2  Nº de versión = versiones existentes + 1 */
      const [[{ maxVer }]] = await conexion.query(
        `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
       FROM archivos
      WHERE registroTipo = 'facturasGastos'
        AND registroId   = ?`,
        [id]
      );
      const numeroVersion = maxVer + 1;

      /* 2.3  Datos básicos del nuevo archivo */
      const extension = req.file.originalname.split(".").pop().toLowerCase();
      const tamanioBytes = req.file.size;

      /* 2.4  Tabla archivos (grupo + versión + activo) */
      const [resArchivo] = await conexion.query(
        `INSERT INTO archivos
       (registroTipo, registroId, grupoArchivoId,
        nombreOriginal, extension, tamanioBytes,
        rutaS3, numeroVersion, estado,
        subidoPor, creadoEn, actualizadoEn)
     VALUES ('facturasGastos', ?, ?, ?, ?, ?, ?, ?, 'activo',
             ?, NOW(), NOW())`,
        [
          id,
          grupoId,
          req.file.originalname,
          extension,
          tamanioBytes,
          claveS3Nueva,
          numeroVersion,
          req.user?.id || null,
        ]
      );
      const archivoId = resArchivo.insertId;

      /* 2.5  versionesArchivo */
      await conexion.query(
        `INSERT INTO versionesArchivo
       (archivoId, numeroVersion, nombreOriginal, extension,
        tamanioBytes, rutaS3, subidoPor, creadoEn)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          archivoId,
          numeroVersion,
          req.file.originalname,
          extension,
          tamanioBytes,
          claveS3Nueva,
          req.user?.id || null,
        ]
      );

      /* 2.6  Evento de sustitución */
      await conexion.query(
        `INSERT INTO eventosArchivo
       (archivoId, accion, usuarioId,
        fechaHora, ip, userAgent, detalles)
     VALUES (?, 'sustitucion', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          req.user?.id || null,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            nombre: req.file.originalname,
            extension,
            ruta: claveS3Nueva,
          }),
        ]
      );

      /* 2.7  Actualizar cuota de almacenamiento del usuario */
      await conexion.query(
        `UPDATE usuarios
        SET usoStorageBytes = usoStorageBytes + ?
      WHERE id = ?`,
        [tamanioBytes, req.user?.id || null]
      );
    }

    await conexion.commit();

    cacheMemoria.del(`gasto_${id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("gastos_")) cacheMemoria.del(k);
    }

    const [[gastoActualizado]] = await conexion.query(
      "SELECT * FROM gastos WHERE id = ?",
      [id]
    );
    const urlFacturaFirmada = gastoActualizado.documento
      ? await generarUrlPrefirmadaLectura(gastoActualizado.documento)
      : null;

    return res.json({
      message: "Gasto actualizado correctamente",
      data: {
        ...gastoActualizado,
        urlFacturaFirmada,
      },
    });
  } catch (error) {
    console.error("Error al actualizar gasto:", error);
    await conexion.rollback();

    if (claveS3Nueva) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: claveS3Nueva,
          })
        );
      } catch (err) {
        console.error("Error al borrar archivo nuevo tras fallo:", err);
      }
    }

    return res
      .status(500)
      .json({ message: "Error interno al actualizar gasto." });
  } finally {
    conexion.release();
  }
};

export const deleteGasto = async (req, res) => {
  const { id } = req.params;
  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    // 1) Verificar existencia y estado
    const [[gastoExistente]] = await conexion.query(
      "SELECT estado, documento FROM gastos WHERE id = ?",
      [id]
    );
    if (!gastoExistente) {
      await conexion.rollback();
      return res.status(404).json({ message: "Gasto no encontrado" });
    }
    if (gastoExistente.estado === "aprobado") {
      await conexion.rollback();
      return res.status(403).json({
        message: "No puedes eliminar un gasto aprobado.",
      });
    }

    // 2) Si hay documento, mover archivo a papelera y actualizar BD
    if (gastoExistente.documento) {
      // 2.1) Mover archivo a papelera
      const nuevaClave = await moverArchivoAPapelera(
        gastoExistente.documento,
        "facturasGastos",
        id
      );

      // 2.2) Actualizar ruta y estado en archivos
      await conexion.query(
        `UPDATE archivos
            SET estado = 'eliminado',
                rutaS3 = ?
          WHERE registroTipo = ? AND registroId = ?`,
        [nuevaClave, "facturasGastos", id]
      );

      // 2.3) Insertar evento de borrado
      const [archivos] = await conexion.query(
        `SELECT id
           FROM archivos
          WHERE registroTipo = ? AND registroId = ?`,
        ["facturasGastos", id]
      );

      if (archivos.length > 0) {
        const archivoId = archivos[0].id;
        await conexion.query(
          `INSERT INTO eventosArchivo
             (archivoId, accion, usuarioId, fechaHora, ip, userAgent, detalles)
           VALUES (?, 'eliminacion', ?, NOW(), ?, ?, ?)`,
          [
            archivoId,
            req.user?.id || null,
            req.ip || null,
            req.get("user-agent") || null,
            JSON.stringify({
              motivo: "Eliminación del gasto",
              nuevaRuta: nuevaClave,
            }),
          ]
        );
      }
    }

    // 3) Eliminar gasto
    await conexion.query("DELETE FROM gastos WHERE id = ?", [id]);

    await conexion.commit();

    // 4) Limpiar caché
    cacheMemoria.del(`gasto_${id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("gastos_")) cacheMemoria.del(k);
    }

    return res.json({
      message: "Gasto eliminado y archivo movido a papelera correctamente.",
    });
  } catch (error) {
    await conexion.rollback();
    console.error("Error al eliminar gasto:", error);
    return res
      .status(500)
      .json({ message: "Error interno al eliminar gasto." });
  } finally {
    conexion.release();
  }
};

export const getGastoById = async (req, res) => {
  try {
    const { id } = req.params;

    /* -------- 1. HIT de caché -------- */
    const claveCache = `gasto_${id}`;
    const enCache = cacheMemoria.get(claveCache);
    if (enCache) return res.json(enCache);
    /* --------------------------------- */

    /* -------- 2. Consulta a la BD -------- */
    const [[gasto]] = await db.query(
      `
      SELECT 
        g.*,
        g.documento,
        p.nombre  AS proveedor_nombre,
        p.id      AS proveedor_id,
        s.nombre  AS sucursal_nombre,
        s.id      AS sucursal_id,
        c.codigo_referencia AS cotizacion_codigo,
        c.codigo_referencia AS codigo,
        c.id      AS cotizacion_id,
        tg.nombre AS tipo_gasto_nombre,
        tg.id     AS tipo_gasto_id
      FROM gastos g
      LEFT JOIN proveedores  p  ON p.id  = g.proveedor_id
      LEFT JOIN sucursales   s  ON s.id  = g.sucursal_id
      LEFT JOIN cotizaciones c  ON c.id  = g.cotizacion_id
      LEFT JOIN tipos_gasto  tg ON tg.id = g.tipo_gasto_id
      WHERE g.id = ?;
      `,
      [id]
    );

    if (!gasto) {
      return res.status(404).json({ message: "Gasto no encontrado" });
    }
    /* ------------------------------------- */

    /* -------- 3. Preparar datos extra -------- */
    const urlFacturaFirmada = gasto.documento
      ? await generarUrlPrefirmadaLectura(gasto.documento)
      : null;

    const [tiposGasto] = await db.query("SELECT id, nombre FROM tipos_gasto");
    const [proveedores] = await db.query(
      "SELECT id, nombre FROM proveedores WHERE estado = 'activo'"
    );
    const [sucursales] = await db.query("SELECT id, nombre FROM sucursales");
    const [cotizaciones] = await db.query(
      "SELECT id, codigo_referencia AS codigo FROM cotizaciones"
    );
    /* ----------------------------------------- */

    /* -------- 4. Construir y cachear respuesta -------- */
    const respuesta = {
      gasto: {
        ...gasto,
        urlFacturaFirmada,
      },
      opciones: {
        tiposGasto,
        proveedores,
        sucursales,
        cotizaciones,
      },
    };

    cacheMemoria.set(claveCache, respuesta); // TTL std: 300 s
    /* ----------------------------------------------- */

    /* -------- 5. Enviar al cliente -------- */
    res.json(respuesta);
  } catch (error) {
    console.error("Error al obtener gasto por ID:", error);
    res.status(500).json({ message: "Error al obtener gasto" });
  }
};

export const getTiposGasto = async (req, res) => {
  try {
    const [tiposGasto] = await db.query("SELECT * FROM tipos_gasto");
    res.json(tiposGasto);
  } catch (error) {
    console.error("Error al obtener tipos de gasto:", error);
    res.status(500).json({ message: "Error al obtener tipos de gasto" });
  }
};

export const getProveedores = async (req, res) => {
  try {
    const [proveedores] = await db.query(
      "SELECT id, nombre FROM proveedores WHERE estado = 'activo'"
    );
    res.json(proveedores);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    res.status(500).json({ message: "Error al obtener proveedores" });
  }
};

export const actualizarEstadoGasto = async (req, res) => {
  try {
    const { id } = req.params; // gasto_id
    const { estado, motivo_rechazo } = req.body;

    /* Actualizar estado y motivo (si aplica) */
    await db.query(
      `
      UPDATE gastos
         SET estado        = ?,
             motivo_rechazo = ?,
             updated_at     = NOW()
       WHERE id = ?
      `,
      [estado, motivo_rechazo || null, id]
    );

    /* 1.1 Invalidar caché (detalle + listados) */
    cacheMemoria.del(`gasto_${id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("gastos_")) cacheMemoria.del(k);
    }

    /* Si el nuevo estado es 'aprobado', crear solicitud de pago */
    if (estado === "aprobado") {
      /* 2.1  Evitar duplicados */
      const [yaExiste] = await db.query(
        "SELECT id FROM solicitudes_pago WHERE gasto_id = ?",
        [id]
      );
      if (yaExiste.length === 0) {
        /* 2.2  Datos necesarios del gasto */
        const [[gasto]] = await db.query(
          `
          SELECT
            usuario_id      AS usuario_solicita_id,
            proveedor_id,
            concepto_pago,
            total           AS monto_total,
            moneda,
            tasa_cambio
          FROM gastos
          WHERE id = ?
          `,
          [id]
        );

        /* 2.3  Generar código consecutivo SP-00001 */
        const [[{ maxId }]] = await db.query(
          "SELECT MAX(id) AS maxId FROM solicitudes_pago"
        );
        const nextId = (maxId || 0) + 1;
        const codigo = `SP-${String(nextId).padStart(5, "0")}`;

        /* 2.4  Insertar la nueva solicitud de pago */
        await db.query(
          `
          INSERT INTO solicitudes_pago (
            codigo,
            gasto_id,
            usuario_solicita_id,
            usuario_revisa_id,
            proveedor_id,
            concepto_pago,
            monto_total,
            monto_pagado,
            estado,
            fecha_solicitud,
            created_at,
            updated_at,
            moneda,
            tasa_cambio
          )
          VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW(),NOW(),?,?)
          `,
          [
            codigo,
            id,
            gasto.usuario_solicita_id,
            req.session.usuario.id, // usuario que aprueba
            gasto.proveedor_id,
            gasto.concepto_pago,
            gasto.monto_total,
            0, // monto_pagado
            "por_pagar",
            gasto.moneda,
            gasto.tasa_cambio,
          ]
        );
      }
    }

    /*  Respuesta */
    res.json({ message: "Estado de gasto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar estado del gasto:", error);
    res
      .status(500)
      .json({ message: "Error interno al actualizar estado del gasto" });
  }
};
