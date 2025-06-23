// Middleware/validarRegistro.js
export const validarRegistro = (req, res, next) => {
  const { tipo } = req.body;

  // 1) Validar tipo de operación
  if (!tipo || !["cotizacion", "gasto"].includes(tipo)) {
    return res.status(400).json({ message: "Tipo de registro inválido" });
  }

  const errores = [];

  // 2) Validaciones específicas para gasto
  if (tipo === "gasto") {
    const {
      proveedor_id,
      tipo_gasto_id,
      concepto_pago,
      subtotal,
      porcentaje_iva = 0,
      fecha,
      sucursal_id,
      usuario_id,
      moneda = "USD",
      cotizacion_id,
      tasa_cambio,
    } = req.body;

    // Campos numéricos opcionales
    const validarNumOpcional = (valor, nombre) => {
      if (
        valor !== undefined &&
        valor !== null &&
        valor !== "" &&
        isNaN(Number(valor))
      ) {
        errores.push(`${nombre} debe ser numérico si se incluye`);
      }
    };
    validarNumOpcional(cotizacion_id, "cotizacion_id");
    validarNumOpcional(tasa_cambio, "tasa_cambio");

    // Campos requeridos
    if (!tipo_gasto_id || isNaN(Number(tipo_gasto_id))) {
      errores.push("tipo_gasto_id es requerido y debe ser numérico");
    }
    if (!concepto_pago || typeof concepto_pago !== "string") {
      errores.push("concepto_pago es requerido y debe ser texto");
    }
    if (subtotal == null || isNaN(Number(subtotal)) || Number(subtotal) <= 0) {
      errores.push("subtotal es requerido y debe ser un número positivo");
    }
    if (isNaN(Number(porcentaje_iva)) || Number(porcentaje_iva) < 0) {
      errores.push("porcentaje_iva debe ser un número no negativo");
    }
    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("fecha inválida");
    }
    if (!sucursal_id || isNaN(Number(sucursal_id))) {
      errores.push("sucursal_id es requerido y debe ser numérico");
    }
    if (!usuario_id || isNaN(Number(usuario_id))) {
      errores.push("usuario_id es requerido y debe ser numérico");
    }
    if (moneda && !["USD", "VES"].includes(moneda)) {
      errores.push("moneda inválida (USD o VES)");
    }
    if (moneda === "VES" && (!tasa_cambio || isNaN(Number(tasa_cambio)))) {
      errores.push("tasa_cambio es requerido para moneda VES");
    }

    // Validación del archivo
    if (!req.file) {
      errores.push("El documento es obligatorio para gastos");
    }
  }

  // 3) Devolver errores o continuar
  if (errores.length) {
    console.error("Errores de validación:", errores);
    return res.status(422).json({ message: "Error de validación", errores });
  }

  // 3) Validaciones específicas para cotización
  if (tipo === "cotizacion") {
    const { proveedor_id, tipo_gasto_id, concepto_pago, fecha, sucursal_id } =
      req.body;

    if (!proveedor_id || isNaN(Number(proveedor_id))) {
      errores.push("proveedor_id es requerido y debe ser numérico");
    }
    if (!tipo_gasto_id || isNaN(Number(tipo_gasto_id))) {
      errores.push("tipo_gasto_id es requerido y debe ser numérico");
    }
    if (!concepto_pago || typeof concepto_pago !== "string") {
      errores.push("concepto_pago es requerido y debe ser texto");
    }
    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("fecha inválida");
    }
    if (!sucursal_id || isNaN(Number(sucursal_id))) {
      errores.push("sucursal_id es requerido y debe ser numérico");
    }

    // Validación del archivo
    if (!req.file) {
      errores.push("El documento es obligatorio para cotizaciones");
    }
  }
  
  next();
};
