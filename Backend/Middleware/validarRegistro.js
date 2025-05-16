export const validarRegistro = async (req, res, next) => {
  console.log("🧾 Body recibido:", req.body);

  const { tipo } = req.body;

  if (!tipo || !["cotizacion", "gasto"].includes(tipo)) {
    return res.status(400).json({ message: "Tipo de registro inválido" });
  }

  const errores = [];

  if (tipo === "gasto") {
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
      usuario_id,
      estado,
      tasa_cambio,
    } = req.body;

    if (
      proveedor_id !== undefined &&
      proveedor_id !== null &&
      proveedor_id !== "" &&
      isNaN(proveedor_id)
    ) {
      errores.push("proveedor_id debe ser numérico si se incluye");
    }

    if (!concepto_pago || typeof concepto_pago !== "string") {
      errores.push("concepto_pago debe ser texto");
    }

    if (descripcion && typeof descripcion !== "string") {
      errores.push("descripcion debe ser texto si se incluye");
    }

    if (!tipo_gasto_id || isNaN(tipo_gasto_id)) {
      errores.push("tipo_gasto_id es requerido y debe ser numérico");
    }

    if (subtotal == null || isNaN(subtotal) || subtotal <= 0) {
      errores.push("subtotal es requerido y debe ser un número positivo");
    }

    if (porcentaje_iva != null && isNaN(porcentaje_iva)) {
      errores.push("porcentaje_iva debe ser numérico si se incluye");
    }

    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("fecha inválida");
    }

    if (!sucursal_id || isNaN(sucursal_id)) {
      errores.push("sucursal_id es requerido y debe ser numérico");
    }

    if (cotizacion_id && isNaN(cotizacion_id)) {
      errores.push("cotizacion_id debe ser numérico si se incluye");
    }

    if (!usuario_id || isNaN(usuario_id)) {
      errores.push("usuario_id es requerido y debe ser numérico");
    }

    if (
      estado &&
      !["pendiente", "solicitado", "aprobado", "pagado"].includes(estado)
    ) {
      errores.push("estado inválido (pendiente, solicitado, aprobado, pagado)");
    }

    if (moneda && typeof moneda !== "string") {
      errores.push("moneda debe ser texto si se incluye");
    }

    if (
      tasa_cambio !== undefined &&
      tasa_cambio !== null &&
      tasa_cambio !== "" &&
      isNaN(tasa_cambio)
    ) {
      errores.push("tasa_cambio debe ser numérico si se incluye");
    }
  }

  next();
};
