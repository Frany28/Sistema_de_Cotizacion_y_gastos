import db from "../config/database.js";
import { s3 } from "../utils/s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export const registrarAbono = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    /* ---------- 1. Datos del request ---------- */
    const {
      cuentaId, // obligatorio
      metodoPago, // 'EFECTIVO' | 'TRANSFERENCIA'
      bancoId = null, // requerido en transferencia
      monedaPago = "USD", // 'USD' | 'VES'
      tasaCambio = 1,
      montoAbonado, // obligatorio
      observaciones = null,
      empleadoId, // id del usuario log-in
    } = req.body;

    /* ---------- 2. Validaciones de negocio ---------- */
    if (!cuentaId || !montoAbonado) {
      return res.status(400).json({
        message: "cuentaId y montoAbonado son requeridos",
      });
    }

    if (!["EFECTIVO", "TRANSFERENCIA"].includes(metodoPago)) {
      return res.status(400).json({ message: "Método de pago inválido" });
    }

    if (metodoPago === "TRANSFERENCIA") {
      if (!bancoId) {
        return res.status(400).json({ message: "Debe indicar el banco" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Adjunte el comprobante de la transferencia" });
      }
    } else {
      // EFECTIVO
      if (bancoId) {
        return res
          .status(400)
          .json({ message: "bancoId debe ser nulo cuando es EFECTIVO" });
      }
    }

    /* ---------- 3. Metadatos del archivo ---------- */
    const file = req.file; // multer-S3 o multer local
    const rutaComprobante = file?.key ?? file?.location ?? file?.path ?? null;
    const nombreOriginal = file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop()?.toLowerCase() ?? null;
    const tamanioBytes = file?.size ?? null;

    /* ---------- 4. Conversión a USD ---------- */
    const montoUSD =
      monedaPago === "USD"
        ? parseFloat(montoAbonado)
        : parseFloat((montoAbonado / tasaCambio).toFixed(2));

    /* ---------- 5. Insertar abono ---------- */
    const [abonoRes] = await connection.execute(
      `INSERT INTO abonos_cuentas
         (cuenta_id, banco_id, metodo_pago,
          moneda_pago, tasa_cambio,
          monto_abonado, monto_usd_calculado,
          ruta_comprobante, observaciones,
          fecha_abono, empleado_id)
      VALUES (?,?,?,?,?,?,?,?,?,NOW(),?)`,
      [
        cuentaId,
        metodoPago === "TRANSFERENCIA" ? bancoId : null,
        metodoPago,
        monedaPago,
        tasaCambio,
        montoAbonado,
        montoUSD,
        rutaComprobante,
        observaciones,
        empleadoId,
      ]
    );
    const abonoId = abonoRes.insertId;

    /* ---------- 6. Si hay comprobante, registrar en archivos y eventos ---------- */
    if (rutaComprobante) {
      // 6.a. TABLA archivos
      const [archivoRes] = await connection.execute(
        `INSERT INTO archivos
           (registroTipo, registroId,
            nombreOriginal, extension, rutaS3, tamanioBytes,
            subidoPor, creadoEn, actualizadoEn)
         VALUES ('abonosCXC',?,?,?,?,?,?,NOW(),NOW())`,
        [
          abonoId,
          nombreOriginal,
          extension,
          rutaComprobante,
          tamanioBytes,
          empleadoId,
        ]
      );
      const archivoId = archivoRes.insertId;

      // 6.b. TABLA eventosArchivo
      await connection.execute(
        `INSERT INTO eventosArchivo
           (archivoId, accion, usuarioId,
            fechaHora, ip, userAgent, detalles)
         VALUES (?,?,?,NOW(),?,?,?)`,
        [
          archivoId,
          "subida",
          empleadoId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({ nombreOriginal, extension, rutaComprobante }),
        ]
      );
    }

    /* ---------- 7. Actualizar saldo restante de la cuenta ---------- */
    await connection.execute(
      `UPDATE cuentas_por_cobrar
          SET saldo_restante = COALESCE(saldo_restante, monto) - ?
        WHERE id = ?`,
      [montoUSD, cuentaId]
    );

    await connection.commit();
    return res.status(201).json({ abonoId });
  } catch (err) {
    await connection.rollback();

    /* Si falló después de subir a S3 intentamos borrar el objeto */
    if (req.file?.key) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: req.file.key,
          })
        );
      } catch (_) {
        console.error("⚠️  No se pudo eliminar el archivo S3 tras rollback");
      }
    }

    console.error("Error al registrar abono:", err);
    return res
      .status(500)
      .json({ message: "Error interno al registrar abono" });
  } finally {
    connection.release();
  }
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

    res.json({ debe, haber, saldo });
  } catch (error) {
    console.error("Error al calcular totales del cliente:", error);
    res.status(500).json({ message: "Error al calcular totales" });
  }
};

// SALDO INDIVIDUAL DE UNA CUENTA
export const getSaldoCuenta = async (req, res) => {
  const { cuenta_id } = req.params;
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
    res.json({ saldo });
  } catch (error) {
    console.error("Error al obtener saldo de la cuenta:", error);
    res.status(500).json({ message: "Error al calcular el saldo" });
  }
};
