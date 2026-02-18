import db from "../config/database.js";
import { s3 } from "../utils/s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import cacheMemoria from "../utils/cacheMemoria.js";

export const registrarAbono = async (req, res) => {
  const cuentaId = Number(req.params.cuenta_id);
  if (!cuentaId || Number.isNaN(cuentaId)) {
    return res.status(400).json({ message: "cuenta_id requerido en la URL" });
  }

  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    // 1) Leer la cuenta y bloquearla (evita carreras al actualizar saldo)
    const [[cuentaRow]] = await conexion.query(
      `SELECT cliente_id, sucursal_id, moneda, tasa_cambio
         FROM cuentas_por_cobrar
        WHERE id = ?
        FOR UPDATE`,
      [cuentaId],
    );

    if (!cuentaRow) {
      await conexion.rollback();
      return res
        .status(404)
        .json({ message: "Cuenta por cobrar no encontrada" });
    }

    const clienteId = cuentaRow.cliente_id;
    const sucursalIdCuenta = cuentaRow.sucursal_id ?? null;

    const monedaCuenta = (cuentaRow.moneda ?? "USD").toUpperCase();
    const tasaCambioCxc =
      cuentaRow.tasa_cambio !== null ? Number(cuentaRow.tasa_cambio) : null;

    // 2) Entrada
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

    // Si viene vacío/undefined => NaN, lo normalizamos luego
    const tasaCambioEntrada = Number(
      req.body.tasa_cambio ?? req.body.tasaCambio,
    );

    const montoAbonado = Number(
      req.body.monto_abonado ?? req.body.monto ?? req.body.montoAbonado ?? 0,
    );

    const observaciones = req.body.observaciones ?? null;
    const usuarioId = req.user?.id || req.session?.usuario?.id || null;

    // 3) Validaciones base
    if (!usuarioId) {
      await conexion.rollback();
      return res
        .status(401)
        .json({ message: "Sesión expirada: reingresa al sistema" });
    }

    if (!montoAbonado || Number.isNaN(montoAbonado)) {
      await conexion.rollback();
      return res
        .status(400)
        .json({ message: "monto_abonado es obligatorio y numérico" });
    }

    if (!["EFECTIVO", "TRANSFERENCIA"].includes(metodoPago)) {
      await conexion.rollback();
      return res.status(400).json({ message: "método_pago inválido" });
    }

    if (!["USD", "VES"].includes(monedaPago)) {
      await conexion.rollback();
      return res
        .status(400)
        .json({ message: "moneda_pago inválida (USD/VES)" });
    }

    if (metodoPago === "TRANSFERENCIA") {
      if (!bancoId) {
        await conexion.rollback();
        return res
          .status(400)
          .json({ message: "banco_id es obligatorio en TRANSFERENCIA" });
      }
      if (!req.file) {
        await conexion.rollback();
        return res
          .status(400)
          .json({ message: "Adjunta el comprobante de transferencia" });
      }
    } else if (bancoId) {
      await conexion.rollback();
      return res.status(400).json({
        message: "banco_id debe ser null cuando el método es EFECTIVO",
      });
    }

    // 4) Resolver tasa FINAL (la del abono manda)
    let tasaCambioFinal = null;

    if (monedaPago === "VES") {
      const tasaEntradaValida =
        Number.isFinite(tasaCambioEntrada) && tasaCambioEntrada > 0;

      const tasaCxcValida = Number.isFinite(tasaCambioCxc) && tasaCambioCxc > 0;

      // Prioridad: tasa del request (modal) > tasa guardada en CxC (fallback)
      tasaCambioFinal = tasaEntradaValida
        ? tasaCambioEntrada
        : tasaCxcValida
          ? tasaCambioCxc
          : null;

      if (!tasaCambioFinal) {
        await conexion.rollback();
        return res.status(400).json({
          message:
            "tasa_cambio es obligatoria cuando la moneda del abono es VES (y debe ser > 0).",
        });
      }

      // Opcional: guardar tasa en CxC solo si está null/ inválida (no la pisamos siempre)
      if (!tasaCxcValida) {
        await conexion.execute(
          `UPDATE cuentas_por_cobrar
              SET tasa_cambio = ?
            WHERE id = ?`,
          [tasaCambioFinal, cuentaId],
        );
      }
    } else {
      // USD: no hace falta tasa
      tasaCambioFinal = null;
    }

    // 5) Archivo (si existe)
    const file = req.file;
    const rutaComprobante = file?.key ?? file?.location ?? file?.path ?? null;
    const nombreOriginal = file?.originalname ?? null;
    const extension = nombreOriginal?.split(".").pop()?.toLowerCase() ?? null;
    const tamanioBytes = file?.size ?? null;

    // 6) Calcular monto en USD (para saldo y consolidación)
    const montoUsd =
      monedaPago === "USD"
        ? parseFloat(montoAbonado.toFixed(2))
        : parseFloat((montoAbonado / tasaCambioFinal).toFixed(2));

    // 7) Insertar abono (guardando sucursal_id y tasa usada)
    const [abonoRes] = await conexion.execute(
      `INSERT INTO abonos_cuentas
         (cuenta_id, sucursal_id, banco_id, metodo_pago, usuario_id,
          moneda_pago, tasa_cambio,
          monto_abonado, monto_usd_calculado,
          ruta_comprobante, observaciones,
          fecha_abono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        cuentaId,
        sucursalIdCuenta,
        metodoPago === "TRANSFERENCIA" ? bancoId : null,
        metodoPago,
        usuarioId,
        monedaPago,
        monedaPago === "VES" ? tasaCambioFinal : 1, // si prefieres NULL en USD, ajusta BD y pon null aquí
        montoAbonado,
        montoUsd,
        rutaComprobante,
        observaciones,
      ],
    );

    const abonoId = abonoRes.insertId;

    // 8) Actualizar saldo de la cuenta (en USD si tu CxC está en USD)
    const [[{ saldo_restante: saldoActual }]] = await conexion.query(
      `SELECT COALESCE(saldo_restante, monto) AS saldo_restante
         FROM cuentas_por_cobrar
        WHERE id = ?
        FOR UPDATE`,
      [cuentaId],
    );

    const nuevoSaldo = parseFloat((Number(saldoActual) - montoUsd).toFixed(2));

    await conexion.execute(
      `UPDATE cuentas_por_cobrar
          SET saldo_restante = ?,
              estado         = IF(? <= 0, 'pagado', estado),
              fecha_pago     = IF(? <= 0 AND fecha_pago IS NULL, NOW(), fecha_pago)
        WHERE id = ?`,
      [nuevoSaldo, nuevoSaldo, nuevoSaldo, cuentaId],
    );

    // 9) Cache
    cacheMemoria.del(`saldo_${cuentaId}`);
    cacheMemoria.del(`totales_${clienteId}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith(`cxc_${clienteId}_`)) cacheMemoria.del(k);
    }

    await conexion.commit();
    return res.status(201).json({
      message: "Abono registrado correctamente",
      abonoId,
      nuevoSaldo,
    });
  } catch (error) {
    await conexion.rollback();

    // Limpieza S3 si se subió archivo
    if (req.file?.key) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: req.file.key,
          }),
        );
      } catch {
        console.error("No se pudo eliminar el archivo S3 tras rollback");
      }
    }

    console.error("Error al registrar abono:", error);
    return res
      .status(500)
      .json({ message: "Error interno al registrar abono" });
  } finally {
    conexion.release();
  }
};

export const obtenerOcrearGrupoAbono = async (conn, abonoId, userId) => {
  const [[g]] = await conn.query(
    `SELECT id FROM archivoGrupos
      WHERE registroTipo = 'abonosCXC' AND registroId = ?`,
    [abonoId],
  );
  if (g) return g.id;

  const [res] = await conn.query(
    `INSERT INTO archivoGrupos
       (registroTipo, registroId, creadoPor, nombreReferencia)
     VALUES ('abonosCXC', ?, ?, ?)`,
    [abonoId, userId, `Comprobantes abono ${abonoId}`],
  );
  return res.insertId;
};
