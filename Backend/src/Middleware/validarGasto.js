// Middleware: validarGasto.js
import db from "../config/database.js";

export const validarGasto = async (req, res, next) => {
  const d = req.body;
  const errors = [];

  /* 1. Validaciones básicas de formato */
  if (!d.tipo_gasto_id || isNaN(d.tipo_gasto_id))
    errors.push("tipo_gasto_id es requerido y debe ser numérico");

  if (!d.concepto_pago || d.concepto_pago.trim().length < 3)
    errors.push("concepto_pago debe tener al menos 3 caracteres");

  if (d.descripcion && d.descripcion.trim().length < 3)
    errors.push("descripcion demasiado corta");

  if (d.subtotal == null || isNaN(d.subtotal) || d.subtotal <= 0)
    errors.push("subtotal debe ser un número positivo");

  if (
    d.porcentaje_iva != null &&
    (isNaN(d.porcentaje_iva) || d.porcentaje_iva < 0)
  )
    errors.push("porcentaje_iva inválido");

  if (!d.fecha || isNaN(new Date(d.fecha).getTime()))
    errors.push("fecha inválida");

  if (!d.sucursal_id || isNaN(d.sucursal_id))
    errors.push("sucursal_id es requerido y debe ser numérico");

  if (
    d.estado &&
    !["pendiente", "aprobado", "pagado", "rechazado"].includes(d.estado)
  )
    errors.push("estado inválido");

  if (d.moneda && typeof d.moneda !== "string")
    errors.push("moneda debe ser texto");

  if (
    d.moneda === "VES" &&
    (d.tasa_cambio == null || isNaN(d.tasa_cambio) || d.tasa_cambio <= 0)
  )
    errors.push("tasa_cambio requerido cuando la moneda es VES");

  /* 2. Reglas dependientes del tipo de gasto */
  if (!errors.length) {
    // Traer info del tipo de gasto
    const [[tipoInfo]] = await db.query(
      "SELECT nombre, rentable FROM tipos_gasto WHERE id = ?",
      [d.tipo_gasto_id]
    );

    if (!tipoInfo) errors.push("tipo_gasto_id no existe");

    const requiereProveedor =
      tipoInfo &&
      (tipoInfo.nombre.includes("Proveedor") ||
        tipoInfo.nombre.includes("Servicio") ||
        tipoInfo.rentable === 1);

    // proveedor_id obligatorio si el tipo lo exige
    if (requiereProveedor) {
      if (!d.proveedor_id || isNaN(d.proveedor_id))
        errors.push("proveedor_id es obligatorio para este tipo de gasto");
    }

    // cotizacion_id obligatorio si es rentable
    if (tipoInfo && tipoInfo.rentable === 1) {
      if (!d.cotizacion_id || isNaN(d.cotizacion_id))
        errors.push("cotizacion_id obligatorio para gastos rentables");
    }
  }

  /* 3. Respuesta o siguiente */
  if (errors.length) return res.status(400).json({ errors });
  next();
};
