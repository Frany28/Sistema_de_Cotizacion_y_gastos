import db from "../config/database.js";
import axios from "axios";

export const registrarAbono = async (req, res) => {
  const {
    cuenta_id,
    usuario_id,
    monto_abonado,
    moneda_pago,
    fecha_abono,
    observaciones,
  } = req.body;

  try {
    let tasa_cambio = 1;
    let monto_usd_calculado = parseFloat(monto_abonado);

    if (moneda_pago === "VES") {
      const dolarToday = await axios.get(
        "https://s3.amazonaws.com/dolartoday/data.json"
      );
      tasa_cambio = parseFloat(dolarToday.data.USD.promedio);
      monto_usd_calculado = parseFloat(
        (monto_abonado / tasa_cambio).toFixed(2)
      );
    }

    // 1. Insertar abono
    await db.query(
      `INSERT INTO abonos_cuentas 
      (cuenta_id, usuario_id, monto_abonado, moneda_pago, tasa_cambio, monto_usd_calculado, fecha_abono, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cuenta_id,
        usuario_id,
        monto_abonado,
        moneda_pago,
        tasa_cambio,
        monto_usd_calculado,
        fecha_abono,
        observaciones,
      ]
    );

    // 2. Recalcular el saldo
    const [[cuenta]] = await db.query(
      `SELECT monto FROM cuentas_por_cobrar WHERE id = ?`,
      [cuenta_id]
    );

    const [[sumaAbonos]] = await db.query(
      `SELECT COALESCE(SUM(monto_usd_calculado), 0) AS total_abonado
       FROM abonos_cuentas WHERE cuenta_id = ?`,
      [cuenta_id]
    );

    const nuevoSaldo = parseFloat(
      (cuenta.monto - sumaAbonos.total_abonado).toFixed(2)
    );

    // 3. Actualizar saldo y estado
    const nuevoEstado = nuevoSaldo <= 0 ? "pagado" : "pendiente";

    await db.query(
      `UPDATE cuentas_por_cobrar
       SET saldo_restante = ?, estado = ?
       WHERE id = ?`,
      [nuevoSaldo, nuevoEstado, cuenta_id]
    );

    res.status(200).json({
      message: "Abono registrado correctamente",
      nuevoSaldo,
      estado: nuevoEstado,
    });
  } catch (error) {
    console.error("Error al registrar abono:", error);
    res.status(500).json({ message: "Error al registrar abono" });
  }
};
