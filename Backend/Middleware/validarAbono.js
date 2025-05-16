// middleware/validarAbono.js
import db from "../config/database.js";

export const validarAbono = async (req, res, next) => {
  const { cuenta_id, monto_abonado, moneda_pago, tasa_cambio, banco_id } =
    req.body;

  try {
    if (!cuenta_id || !monto_abonado || !moneda_pago || !banco_id) {
      return res
        .status(400)
        .json({ message: "Datos incompletos para validar el abono." });
    }

    // Verificar que el banco existe
    const [[banco]] = await db.query(
      `SELECT id FROM bancos WHERE id = ? AND estado = 'activo'`,
      [banco_id]
    );

    if (!banco) {
      return res
        .status(400)
        .json({ message: "El banco seleccionado no existe o está inactivo." });
    }
    
    if (!cuenta_id || !monto_abonado || !moneda_pago) {
      return res
        .status(400)
        .json({ message: "Datos incompletos para validar el abono." });
    }

    const [[cuenta]] = await db.query(
      `SELECT saldo_restante FROM cuentas_por_cobrar WHERE id = ?`,
      [cuenta_id]
    );

    if (!cuenta) {
      return res
        .status(404)
        .json({ message: "La cuenta por cobrar no existe." });
    }

    let montoUSD = parseFloat(monto_abonado);

    if (moneda_pago === "VES") {
      if (!tasa_cambio) {
        return res.status(400).json({
          message: "Debe incluir la tasa de cambio para pagos en VES.",
        });
      }
      montoUSD = parseFloat(monto_abonado) / parseFloat(tasa_cambio);
    }

    if (montoUSD > parseFloat(cuenta.saldo_restante)) {
      return res.status(400).json({
        message: "El monto del abono excede el saldo pendiente de la cuenta.",
      });
    }

    next();
  } catch (error) {
    console.error("Error en la validación del abono:", error);
    res.status(500).json({ message: "Error al validar el abono." });
  }
};
