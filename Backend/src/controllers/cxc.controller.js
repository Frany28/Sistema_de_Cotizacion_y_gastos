import db from "../config/database.js";
import { s3 } from "../utils/s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import cacheMemoria from "../utils/cacheMemoria.js";

export const registrarAbono = async (req, res) => {
  /* ───────── 0. Parámetro de URL ───────── */
  const cuentaId = Number(req.params.cuenta_id);
  if (!cuentaId || Number.isNaN(cuentaId)) {
    return res.status(400).json({ message: "cuenta_id requerido en la URL" });
  }

  /* ───────── 1. Conexión ───────── */
  const conn = await db.getConnection();

  try {
    /* ───────── 1.a  Obtener cliente_id de la cuenta ───────── */
    const [[cuentaRow]] = await conn.query(
      "SELECT cliente_id FROM cuentas_por_cobrar WHERE id = ?",
      [cuentaId]
    );
    if (!cuentaRow) {
      conn.release();
      return res
        .status(404)
        .json({ message: "Cuenta por cobrar no encontrada" });
    }
    const clienteId = cuentaRow.cliente_id;

    /* ───────── 1.b  Iniciar transacción ───────── */
    await conn.beginTransaction();

    /* ───────── 2. Parámetros de entrada ───────── */
    const metodoPago = (
      req.body.metodo_pago ??
      req.body.metodoPago ??
      ""
    ).toUpperCase();

    const bancoId = req.body.banco_id ?? req.body.bancoId ?? null;

    const monedaPago = (
      req.body.moneda_pago ??
      req.body.moneda ??
      req.body.monedaPago ??
      "USD"
    ).toUpperCase();

    const tasaCambio = Number(req.body.tasa_cambio ?? req.body.tasaCambio ?? 1);

    const montoAbonado = Number(
      req.body.monto_abonado ?? req.body.monto ?? req.body.montoAbonado ?? 0
    );

    const observaciones = req.body.observaciones ?? null;

    const usuarioId = req.user?.id || req.session?.usuario?.id || null;

    /* ───────── 3. Validaciones previas ───────── */
    if (!usuarioId) {
      return res
        .status(401)
        .json({ message: "Sesión expirada: reingresa al sistema" });
    }
    if (!montoAbonado || Number.isNaN(montoAbonado)) {
      return res
        .status(400)
        .json({ message: "monto_abonado es obligatorio y numérico" });
    }
    if (!["EFECTIVO", "TRANSFERENCIA"].includes(metodoPago)) {
      return res.status(400).json({ message: "método_pago inválido" });
    }
    if (metodoPago === "TRANSFERENCIA") {
      if (!bancoId) {
        return res
          .status(400)
          .json({ message: "banco_id es obligatorio en TRANSFERENCIA" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Adjunta el comprobante de transferencia" });
      }
    } else if (bancoId) {
      return res.status(400).json({
        message: "banco_id debe ser null cuando el método es EFECTIVO",
      });
    }

    /* ───────── 4. Información del archivo (si existe) ───────── */
    const file = req.file;
    const rutaComprobante = file?.key ?? file?.location ?? file?.path ?? null;
    const nombreOriginal = file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop()?.toLowerCase() ?? null;
    const tamanioBytes = file?.size ?? null;

    /* ───────── 5. Conversión monto → USD ───────── */
    const montoUsd =
      monedaPago === "USD"
        ? parseFloat(montoAbonado.toFixed(2))
        : parseFloat((montoAbonado / tasaCambio).toFixed(2));

    /* ───────── 6. Insertar abono_cuentas ───────── */
    const [abonoRes] = await conn.execute(
      `INSERT INTO abonos_cuentas
         (cuenta_id, banco_id, metodo_pago, usuario_id,
          moneda_pago, tasa_cambio,
          monto_abonado, monto_usd_calculado,
          ruta_comprobante, observaciones,
          fecha_abono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        cuentaId,
        metodoPago === "TRANSFERENCIA" ? bancoId : null,
        metodoPago,
        usuarioId,
        monedaPago,
        tasaCambio,
        montoAbonado,
        montoUsd,
        rutaComprobante,
        observaciones,
      ]
    );
    const abonoId = abonoRes.insertId;

    /* ───────── 7. Registrar archivo + versión + evento ───────── */
    if (rutaComprobante) {
      // 7.1 Grupo
      const grupoId = await obtenerOcrearGrupoAbono(conn, abonoId, usuarioId);

      // 7.2 Nº de versión (si ya había algún comprobante)
      const [[{ maxVer }]] = await conn.query(
        `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
       FROM archivos
      WHERE registroTipo = 'abonosCXC' AND registroId = ?`,
        [abonoId]
      );
      const numeroVersion = maxVer + 1;

      // 7.3 Tabla archivos
      const [aRes] = await conn.query(
        `INSERT INTO archivos
       (registroTipo, registroId, grupoArchivoId,
        nombreOriginal, extension, tamanioBytes,
        rutaS3, numeroVersion, estado,
        subidoPor, creadoEn, actualizadoEn)
     VALUES ('abonosCXC', ?, ?, ?, ?, ?, ?, ?, 'activo',
             ?, NOW(), NOW())`,
        [
          abonoId,
          grupoId,
          nombreOriginal,
          extension,
          tamanioBytes,
          rutaComprobante,
          numeroVersion,
          usuarioId,
        ]
      );
      const archivoId = aRes.insertId;

      // 7.4 Snapshot versionesArchivo
      const [vRes] = await conn.query(
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
          rutaComprobante,
          usuarioId,
        ]
      );
      const versionId = vRes.insertId;

      // 7.5 Evento auditoría
      await conn.query(
        `INSERT INTO eventosArchivo
       (archivoId, versionId, accion, usuarioId,
        ip, userAgent, detalles)
     VALUES (?, ?, 'subida', ?, ?, ?, ?)`,
        [
          archivoId,
          versionId,
          usuarioId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({ nombreOriginal, extension, rutaComprobante }),
        ]
      );

      // 7.6 Cuota del usuario dueño
      await conn.query(
        `UPDATE usuarios
        SET usoStorageBytes = usoStorageBytes + ?
      WHERE id = ?`,
        [tamanioBytes, usuarioId]
      );
    }

    /* ───────── 8. Actualizar saldo de la CxC ───────── */
    const [[{ saldo_restante: saldoActual }]] = await conn.query(
      `SELECT COALESCE(saldo_restante, monto) AS saldo_restante
         FROM cuentas_por_cobrar
        WHERE id = ? FOR UPDATE`,
      [cuentaId]
    );

    const nuevoSaldo = parseFloat((saldoActual - montoUsd).toFixed(2));

    await conn.execute(
      `UPDATE cuentas_por_cobrar
         SET saldo_restante = ?,
             estado         = IF(? <= 0, 'pagado', estado),
             fecha_pago     = IF(? <= 0 AND fecha_pago IS NULL, NOW(), fecha_pago)
       WHERE id = ?`,
      [nuevoSaldo, nuevoSaldo, nuevoSaldo, cuentaId]
    );

    /* ───────── 8.b  Invalidar caché ───────── */
    cacheMemoria.del(`saldo_${cuentaId}`);
    cacheMemoria.del(`totales_${clienteId}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith(`cxc_${clienteId}_`)) cacheMemoria.del(k);
    }

    /* ───────── 9. Commit & respuesta ───────── */
    await conn.commit();
    return res.status(201).json({
      message: "Abono registrado correctamente",
      abonoId,
      nuevoSaldo,
    });
  } catch (err) {
    await conn.rollback();

    /* Limpieza S3 si se subió archivo y falló la transacción */
    if (req.file?.key) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: req.file.key,
          })
        );
      } catch {
        console.error("No se pudo eliminar el archivo S3 tras rollback");
      }
    }

    console.error("Error al registrar abono:", err);
    return res
      .status(500)
      .json({ message: "Error interno al registrar abono" });
  } finally {
    conn.release();
  }
};

export const obtenerOcrearGrupoAbono = async (conn, abonoId, userId) => {
  const [[g]] = await conn.query(
    `SELECT id FROM archivoGrupos
      WHERE registroTipo = 'abonosCXC' AND registroId = ?`,
    [abonoId]
  );
  if (g) return g.id;

  const [res] = await conn.query(
    `INSERT INTO archivoGrupos
       (registroTipo, registroId, creadoPor, nombreReferencia)
     VALUES ('abonosCXC', ?, ?, ?)`,
    [abonoId, userId, `Comprobantes abono ${abonoId}`]
  );
  return res.insertId;
};

// LISTAR CUENTAS POR COBRAR DE UN CLIENTE
export const listaCuentasPorCobrar = async (req, res) => {
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 10
    : Number(req.query.limit);
  const offset = (page - 1) * limit;
  const { cliente_id } = req.query;

  const claveCache = `cxc_${cliente_id}_${page}_${limit}`;
  const enCache = cacheMemoria.get(claveCache);
  if (enCache) return res.json(enCache);

  if (!cliente_id) {
    return res.status(400).json({ message: "cliente_id es requerido" });
  }

  try {
    // 1. Total de cuentas
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM cuentas_por_cobrar
       WHERE cliente_id = ?`,
      [cliente_id]
    );

    // 2. Obtener cuentas paginadas
    const [cuentas] = await db.query(
      `SELECT 
        cxc.id,
        cxc.codigo,
        cxc.cotizacion_id,
        cli.nombre AS cliente_nombre,
        cxc.monto,
        cxc.estado,
        cxc.fecha_emision,
        cxc.fecha_vencimiento
       FROM cuentas_por_cobrar cxc
       JOIN clientes cli ON cli.id = cxc.cliente_id
       WHERE cxc.cliente_id = ?
       ORDER BY cxc.fecha_vencimiento ASC
       LIMIT ${limit} OFFSET ${offset}`,
      [cliente_id]
    );

    // 3. Si no hay cuentas, respondemos de una vez
    if (cuentas.length === 0) {
      return res.json({
        cuentas: [],
        total,
        page,
        limit,
      });
    }

    // 4. Obtener abonos por cuenta
    const [abonos] = await db.query(
      `SELECT cuenta_id, SUM(monto_usd_calculado) AS abonado
       FROM abonos_cuentas
       WHERE cuenta_id IN (${cuentas.map((c) => c.id).join(",")})
       GROUP BY cuenta_id`
    );

    const abonosMap = {};
    abonos.forEach((row) => {
      abonosMap[row.cuenta_id] = parseFloat(row.abonado);
    });

    // 5. Calcular saldo restante
    cuentas.forEach((cuenta) => {
      const abonado = abonosMap[cuenta.id] || 0;
      cuenta.saldo_restante = parseFloat((cuenta.monto - abonado).toFixed(2));
    });

    cacheMemoria.set(claveCache, { cuentas, total, page, limit }); // TTL 5 min

    // 6. Enviar respuesta
    return res.json({
      cuentas,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener cuentas por cobrar" });
  }
};

// CLIENTES CON CUENTAS POR COBRAR (APROBADAS)
export const clientesConCXC = async (req, res) => {
  const clave = "clientesConCxc";
  const hit = cacheMemoria.get(clave);
  if (hit) return res.json(hit);

  try {
    const [rows] = await db.query(
      `SELECT DISTINCT 
         cli.id,
         cli.codigo_referencia,
         cli.nombre
       FROM cuentas_por_cobrar cxc
       JOIN clientes cli ON cli.id = cxc.cliente_id
       JOIN cotizaciones cot ON cot.id = cxc.cotizacion_id
       WHERE cot.estado = 'aprobada'
       ORDER BY cli.nombre ASC`
    );
    cacheMemoria.set(clave, rows, 600);

    res.json(rows);
  } catch (error) {
    console.error(
      "Error al obtener clientes con cuentas aprobadas por cobrar:",
      error
    );
    res
      .status(500)
      .json({ message: "Error al obtener clientes con CXC aprobadas" });
  }
};

// TOTALES (DEBE, HABER, SALDO) POR CLIENTE
export const getTotalesPorCliente = async (req, res) => {
  const { cliente_id } = req.params;
  const clave = `totales_${cliente_id}`;
  const hit = cacheMemoria.get(clave);
  if (hit) return res.json(hit);

  try {
    if (!cliente_id) {
      return res.status(400).json({ message: "Cliente no especificado" });
    }

    // 1. Total DEBE
    const [debeResult] = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS debe
       FROM cuentas_por_cobrar
       WHERE cliente_id = ? AND estado != 'pagado'`,
      [cliente_id]
    );

    const debe = parseFloat(debeResult[0].debe);

    // 2. Total HABER
    const [haberResult] = await db.query(
      `SELECT COALESCE(SUM(monto_usd_calculado), 0) AS haber
       FROM abonos_cuentas
       WHERE cuenta_id IN (
         SELECT id FROM cuentas_por_cobrar WHERE cliente_id = ?
       )`,
      [cliente_id]
    );

    const haber = parseFloat(haberResult[0].haber);

    // 3. SALDO
    const saldo = parseFloat((debe - haber).toFixed(2));
    cacheMemoria.set(clave, { debe, haber, saldo });
    res.json({ debe, haber, saldo });
  } catch (error) {
    console.error("Error al calcular totales del cliente:", error);
    res.status(500).json({ message: "Error al calcular totales" });
  }
};

// SALDO INDIVIDUAL DE UNA CUENTA
export const getSaldoCuenta = async (req, res) => {
  const { cuenta_id } = req.params;
  const clave = `saldo_${cuenta_id}`;
  const hit = cacheMemoria.get(clave);
  if (hit) return res.json(hit);
  try {
    const [[{ monto }]] = await db.query(
      "SELECT monto FROM cuentas_por_cobrar WHERE id = ?",
      [cuenta_id]
    );

    if (!monto) {
      return res.status(404).json({ message: "Cuenta no encontrada" });
    }

    const [[{ abonado }]] = await db.query(
      `SELECT COALESCE(SUM(monto_usd_calculado), 0) AS abonado
       FROM abonos_cuentas WHERE cuenta_id = ?`,
      [cuenta_id]
    );

    const saldo = parseFloat((monto - abonado).toFixed(2));
    cacheMemoria.set(clave, { saldo }, 120);
    res.json({ saldo });
  } catch (error) {
    console.error("Error al obtener saldo de la cuenta:", error);
    res.status(500).json({ message: "Error al calcular el saldo" });
  }
};
