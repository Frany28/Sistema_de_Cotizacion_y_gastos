// src/middlewares/validarEliminacionCliente.js
import db from "../config/database.js";

export const validarEliminacionCliente = async (req, res, next) => {
  const clienteId = Number(req.params.id);

  try {
    // Cuentas por cobrar pendientes
    const [[{ cuentaPendiente }]] = await db.execute(
      `SELECT COUNT(*) AS cuentaPendiente
         FROM cuentas_por_cobrar
        WHERE cliente_id = ? AND estado = 'pendiente'`,
      [clienteId]
    );
    if (cuentaPendiente > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar: el cliente tiene cuentas por cobrar pendientes.",
      });
    }

    // Cotizaciones en proceso
    const [[{ cotizacionPendiente }]] = await db.execute(
      `SELECT COUNT(*) AS cotizacionPendiente
         FROM cotizaciones
        WHERE cliente_id = ? AND estado = 'pendiente'`,
      [clienteId]
    );
    if (cotizacionPendiente > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar: el cliente tiene cotizaciones en proceso.",
      });
    }

    // Si pasa ambas, seguimos al controlador
    next();
  } catch (err) {
    console.error("Error en validarEliminacionCliente:", err);
    return res
      .status(500)
      .json({ message: "Error interno al validar eliminación" });
  }
};
