export const validarRegistro = async (req, res, next) => {
  // Cambiar 'documento' por 'comprobante' para coincidir con el frontend
  const datosCombinados = {
    ...req.body,
    comprobante: req.file ? req.file.originalname : null,
  };

  if (!tipo || !["cotizacion", "gasto"].includes(tipo)) {
    return res.status(400).json({
      message: "Tipo de registro inválido",
      debug: {
        receivedContentType: req.headers["content-type"],
        receivedIsMultipart: req.is("multipart/form-data"),
        receivedBody: req.body,
        filePresent: !!req.file,
      },
    });
  }

  const errores = [];

  // 4. Validación específica para gastos
  if (tipo === "gasto") {
    const {
      proveedor_id,
      concepto_pago,
      tipo_gasto_id,
      descripcion,
      subtotal,
      porcentaje_iva = 0,
      fecha,
      sucursal_id,
      cotizacion_id,
      moneda = "USD",
      usuario_id,
      estado = "pendiente",
      tasa_cambio,
    } = datosCombinados;

    // Validación de campos numéricos opcionales
    const validarCampoNumericoOpcional = (valor, nombre) => {
      if (
        valor !== undefined &&
        valor !== null &&
        valor !== "" &&
        isNaN(valor)
      ) {
        errores.push(`${nombre} debe ser numérico si se incluye`);
      }
    };

    validarCampoNumericoOpcional(proveedor_id, "proveedor_id");
    validarCampoNumericoOpcional(cotizacion_id, "cotizacion_id");
    validarCampoNumericoOpcional(tasa_cambio, "tasa_cambio");

    if (!req.file) {
      return res.status(400).json({
        message: "Falta el comprobante",
        debug: {
          receivedBody: req.body,
          filePresent: !!req.file,
        },
      });
    }

    // Validación de campos requeridos
    if (!concepto_pago || typeof concepto_pago !== "string") {
      errores.push("Concepto de pago es requerido y debe ser texto");
    }

    if (!tipo_gasto_id || isNaN(tipo_gasto_id)) {
      errores.push("Tipo de gasto es requerido y debe ser numérico");
    }

    if (subtotal == null || isNaN(subtotal) || subtotal <= 0) {
      errores.push("Subtotal es requerido y debe ser un número positivo");
    }

    if (isNaN(porcentaje_iva) || porcentaje_iva < 0) {
      errores.push("Porcentaje IVA debe ser un número no negativo");
    }

    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("Fecha inválida");
    }

    if (!sucursal_id || isNaN(sucursal_id)) {
      errores.push("Sucursal es requerida y debe ser numérico");
    }

    if (!usuario_id || isNaN(usuario_id)) {
      errores.push("Usuario es requerido y debe ser numérico");
    }

    if (
      estado &&
      !["pendiente", "solicitado", "aprobado", "pagado"].includes(estado)
    ) {
      errores.push(
        "Estado inválido (valores permitidos: pendiente, solicitado, aprobado, pagado)"
      );
    }

    if (moneda && !["USD", "VES"].includes(moneda)) {
      errores.push("Moneda inválida (valores permitidos: USD, VES)");
    }

    // Validación especial para moneda VES
    if (moneda === "VES" && (!tasa_cambio || isNaN(tasa_cambio))) {
      errores.push("Tasa de cambio es requerida para moneda VES");
    }

    // Validación de archivo para gastos
    if (!req.file) {
      errores.push("El comprobante es obligatorio para gastos");
    }

    if (!descripcion || typeof descripcion !== "string") {
      errores.push("Descripción es requerida y debe ser texto");
    }
  }

  // 5. Manejo de errores
  if (errores.length > 0) {
    console.error("Errores de validación:", errores);
    return res.status(422).json({
      message: "Error de validación",
      errores,
    });
  }

  // 6. Adjuntamos los datos combinados al request para el siguiente middleware
  req.combinedData = datosCombinados;
  next();
};
