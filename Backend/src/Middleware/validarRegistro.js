import db from "../config/database.js";
import path from "path";

export const validarRegistro = async (req, res, next) => {
  const datosCombinados = {
    ...req.body,
    documento: req.file ? req.file.originalname : null,
  };

  const { tipo } = datosCombinados;

  if (!tipo || !["cotizacion", "gasto"].includes(tipo)) {
    return res.status(400).json({ message: "Tipo de registro inválido." });
  }

  const errores = [];

  // VALIDACIONES COMUNES A AMBOS TIPOS

  if (datosCombinados.fecha) {
    const fechaRegistro = new Date(datosCombinados.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaRegistro > hoy) {
      errores.push("La fecha no puede ser en el futuro.");
    }
  }

  if (datosCombinados.sucursal_id) {
    const [sucursal] = await db.query(
      "SELECT id FROM sucursales WHERE id = ?",
      [datosCombinados.sucursal_id]
    );
    if (sucursal.length === 0) {
      errores.push("La sucursal seleccionada no existe.");
    }
  }

  if (datosCombinados.creadoPor) {
    const [usuario] = await db.query("SELECT id FROM usuarios WHERE id = ?", [
      datosCombinados.creadoPor,
    ]);
    if (usuario.length === 0) {
      errores.push("El usuario especificado no existe.");
    }
  }

  /*───────────────────────────────
   * VALIDACIONES PARA GASTO
   *───────────────────────────────*/
  if (tipo === "gasto") {
    const {
      proveedor_id,
      concepto_pago,
      tipo_gasto_id,
      subtotal,
      porcentaje_iva = 0,
      fecha,
      sucursal_id,
      cotizacion_id,
      moneda = "USD",
      creadoPor,
      estado = "pendiente",
      tasa_cambio,
    } = datosCombinados;

    const validarCampoNumericoOpcional = (valor, nombre) => {
      if (
        valor !== undefined &&
        valor !== null &&
        valor !== "" &&
        isNaN(valor)
      ) {
        errores.push(`${nombre} debe ser numérico si se incluye.`);
      }
    };

    validarCampoNumericoOpcional(proveedor_id, "proveedor_id");
    validarCampoNumericoOpcional(cotizacion_id, "cotizacion_id");
    validarCampoNumericoOpcional(tasa_cambio, "tasa_cambio");

    // Regla especial: si el tipo de gasto es Operativo (id = 1), el proveedor es obligatorio
    if (tipo_gasto_id && !isNaN(tipo_gasto_id)) {
      const [[tipoGasto]] = await db.query(
        "SELECT id, nombre FROM tipos_gasto WHERE id = ?",
        [tipo_gasto_id]
      );

      if (!tipoGasto) {
        errores.push("El tipo de gasto seleccionado no existe.");
      } else {
        const esGastoOperativo = tipoGasto.id === 1; // 1 = Operativo en tu tabla

        if (esGastoOperativo && (!proveedor_id || isNaN(proveedor_id))) {
          errores.push(
            "El proveedor es obligatorio para los gastos operativos."
          );
        }
      }
    }

    if (!concepto_pago || typeof concepto_pago !== "string") {
      errores.push("El concepto de pago es requerido y debe ser texto.");
    }

    if (!tipo_gasto_id || isNaN(tipo_gasto_id)) {
      errores.push("El tipo de gasto es requerido y debe ser numérico.");
    }

    if (subtotal == null || isNaN(subtotal) || subtotal <= 0) {
      errores.push("El subtotal es requerido y debe ser mayor a cero.");
    }

    if (isNaN(porcentaje_iva) || porcentaje_iva < 0) {
      errores.push("El porcentaje de IVA debe ser un número no negativo.");
    }

    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("La fecha del gasto es inválida.");
    }

    if (!sucursal_id || isNaN(sucursal_id)) {
      errores.push("La sucursal es requerida y debe ser numérica.");
    }

    if (!creadoPor || isNaN(creadoPor)) {
      errores.push("El usuario es requerido y debe ser numérico.");
    }

    if (
      estado &&
      !["pendiente", "solicitado", "aprobado", "pagado"].includes(estado)
    ) {
      errores.push(
        "El estado es inválido. Valores permitidos: pendiente, solicitado, aprobado, pagado."
      );
    }

    if (moneda && !["USD", "VES"].includes(moneda)) {
      errores.push("La moneda es inválida. Valores permitidos: USD, VES.");
    }

    if (moneda === "VES" && (!tasa_cambio || isNaN(tasa_cambio))) {
      errores.push("La tasa de cambio es requerida para la moneda VES.");
    }

    // VALIDACIONES DE ARCHIVO

    if (!req.file) {
      errores.push("El comprobante es obligatorio para gastos.");
    } else {
      const extensionArchivo = path
        .extname(req.file.originalname)
        .toLowerCase();

      const extensionesPermitidas = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

      if (!extensionesPermitidas.includes(extensionArchivo)) {
        errores.push(
          "Extensión de archivo no permitida. Solo se admiten PDF o imágenes (png, jpg, webp)."
        );
      }

      if (req.file.size > 2 * 1024 * 1024) {
        errores.push("El archivo excede el tamaño máximo permitido de 2 MB.");
      }

      const [archivoExistente] = await db.query(
        `SELECT id FROM archivos WHERE nombreOriginal = ?`,
        [req.file.originalname]
      );

      if (archivoExistente.length > 0) {
        errores.push(
          `El archivo ${req.file.originalname} ya existe registrado en la base de datos.`
        );
      }
    }

    // VALIDAR EXISTENCIA DE PROVEEDOR SI VIENE INFORMADO
    if (proveedor_id) {
      const [proveedor] = await db.query(
        `SELECT id FROM proveedores WHERE id = ?`,
        [proveedor_id]
      );
      if (proveedor.length === 0) {
        errores.push("El proveedor seleccionado no existe.");
      }
    }

    // VALIDAR EXISTENCIA DE COTIZACIÓN SI VIENE INFORMADA
    if (cotizacion_id) {
      const [cotizacion] = await db.query(
        `SELECT id FROM cotizaciones WHERE id = ?`,
        [cotizacion_id]
      );
      if (cotizacion.length === 0) {
        errores.push("La cotización seleccionada no existe.");
      }
    }

    // VALIDAR DUPLICIDAD DE GASTO
    const [gastoDuplicado] = await db.query(
      `SELECT id FROM gastos
         WHERE proveedor_id = ?
           AND concepto_pago = ?
           AND subtotal = ?
           AND fecha = ?
           AND sucursal_id = ?`,
      [proveedor_id || null, concepto_pago, subtotal, fecha, sucursal_id]
    );

    if (gastoDuplicado.length > 0) {
      errores.push(
        "Ya existe un gasto registrado con estos datos. Verifica antes de continuar."
      );
    }
  }

  /*───────────────────────────────
   * VALIDACIONES PARA COTIZACIÓN
   *───────────────────────────────*/
  if (tipo === "cotizacion") {
    const { cliente_id, fecha, total } = datosCombinados;

    if (!cliente_id || isNaN(cliente_id)) {
      errores.push("El cliente es obligatorio y debe ser numérico.");
    } else {
      const [cliente] = await db.query(`SELECT id FROM clientes WHERE id = ?`, [
        cliente_id,
      ]);
      if (cliente.length === 0) {
        errores.push("El cliente seleccionado no existe.");
      }
    }

    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("La fecha de la cotización es inválida.");
    }

    if (total == null || isNaN(total) || total <= 0) {
      errores.push("El total es obligatorio y debe ser mayor a cero.");
    }

    // VALIDAR DUPLICIDAD DE COTIZACIÓN
    const [cotizacionDuplicada] = await db.query(
      `SELECT id FROM cotizaciones
         WHERE cliente_id = ?
           AND fecha = ?
           AND total = ?`,
      [cliente_id || null, fecha, total]
    );

    if (cotizacionDuplicada.length > 0) {
      errores.push(
        "Ya existe una cotización registrada para este cliente en la misma fecha y con el mismo total."
      );
    }
  }

  if (errores.length > 0) {
    console.error("Errores de validación:", errores);
    return res.status(422).json({
      message: "Error de validación.",
      errores,
    });
  }

  req.combinedData = datosCombinados;
  next();
};
