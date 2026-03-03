import db from "../config/database.js";
import path from "path";

export const validarRegistro = async (req, res, next) => {
  const datosCombinados = {
    ...req.body,
    documento: req.file ? req.file.originalname : null,
  };

  const tipo = (datosCombinados.tipo || "").trim().toLowerCase();

  if (!tipo || !["cotizacion", "gasto"].includes(tipo)) {
    return res.status(400).json({ message: "Tipo de registro inválido." });
  }

  // Requiere usuario autenticado (para regla sucursal)
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado." });
  }

  const errores = [];

  const esAdmin = Number(req.user?.rol_id) === 1;
  const sucursalIdUsuario = Number(req.user?.sucursal_id);

  // Si NO es admin, se fuerza sucursal_id al del usuario
  if (!esAdmin) {
    if (!sucursalIdUsuario || Number.isNaN(sucursalIdUsuario)) {
      return res
        .status(403)
        .json({ message: "Tu usuario no tiene sucursal asignada." });
    }
    datosCombinados.sucursal_id = sucursalIdUsuario;
  }

  /*───────────────────────────────
   * VALIDACIONES COMUNES
   *───────────────────────────────*/

  // Fecha no futura (si viene)
  if (datosCombinados.fecha) {
    const fechaRegistro = new Date(datosCombinados.fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (!Number.isNaN(fechaRegistro.getTime()) && fechaRegistro > hoy) {
      errores.push("La fecha no puede ser en el futuro.");
    }
  }

  // Validar sucursal_id (si viene o fue forzada)
  if (datosCombinados.sucursal_id) {
    const sucursalId = Number(datosCombinados.sucursal_id);
    if (Number.isNaN(sucursalId)) {
      errores.push("La sucursal es inválida.");
    } else {
      const [sucursal] = await db.query(
        "SELECT id FROM sucursales WHERE id = ?",
        [sucursalId],
      );
      if (sucursal.length === 0) {
        errores.push("La sucursal seleccionada no existe.");
      }
    }
  }

  // Validar creadoPor si viene (si no viene, el controlador lo puede derivar)
  if (datosCombinados.creadoPor) {
    const creadoPorId = Number(datosCombinados.creadoPor);
    if (Number.isNaN(creadoPorId)) {
      errores.push("El usuario (creadoPor) es inválido.");
    } else {
      const [usuario] = await db.query("SELECT id FROM usuarios WHERE id = ?", [
        creadoPorId,
      ]);
      if (usuario.length === 0) {
        errores.push("El usuario especificado no existe.");
      }
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

    if (!concepto_pago || typeof concepto_pago !== "string") {
      errores.push("El concepto de pago es requerido y debe ser texto.");
    }

    if (!tipo_gasto_id || isNaN(tipo_gasto_id)) {
      errores.push("El tipo de gasto es requerido y debe ser numérico.");
    }

    if (subtotal == null || isNaN(subtotal) || Number(subtotal) <= 0) {
      errores.push("El subtotal es requerido y debe ser mayor a cero.");
    }

    if (isNaN(porcentaje_iva) || Number(porcentaje_iva) < 0) {
      errores.push("El porcentaje de IVA debe ser un número no negativo.");
    }

    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("La fecha del gasto es inválida.");
    }

    if (!sucursal_id || isNaN(sucursal_id)) {
      errores.push("La sucursal es requerida y debe ser numérica.");
    }

    if (!creadoPor || isNaN(creadoPor)) {
      // Si tú siempre lo llenas en el controlador con datos.usuario, puedes hacerlo opcional.
      // Lo dejo como lo tenías, porque tu lógica actual lo usa.
      errores.push("El usuario es requerido y debe ser numérico.");
    }

    if (
      estado &&
      !["pendiente", "solicitado", "aprobado", "pagado"].includes(estado)
    ) {
      errores.push(
        "El estado es inválido. Valores permitidos: pendiente, solicitado, aprobado, pagado.",
      );
    }

    if (moneda && !["USD", "VES"].includes(moneda)) {
      errores.push("La moneda es inválida. Valores permitidos: USD, VES.");
    }

    if (moneda === "VES" && (!tasa_cambio || isNaN(tasa_cambio))) {
      errores.push("La tasa de cambio es requerida para la moneda VES.");
    }

    // Regla especial: si el tipo de gasto es Operativo (id = 1), el proveedor es obligatorio
    if (tipo_gasto_id && !isNaN(tipo_gasto_id)) {
      const [[tipoGasto]] = await db.query(
        "SELECT id, nombre FROM tipos_gasto WHERE id = ?",
        [tipo_gasto_id],
      );

      if (!tipoGasto) {
        errores.push("El tipo de gasto seleccionado no existe.");
      } else {
        const esGastoOperativo = Number(tipoGasto.id) === 1;

        if (esGastoOperativo && (!proveedor_id || isNaN(proveedor_id))) {
          errores.push(
            "El proveedor es obligatorio para los gastos operativos.",
          );
        }
      }
    }

    // ARCHIVO: NO obligatorio (para coincidir con tu controlador). Se valida solo si viene.
    if (req.file) {
      const extensionArchivo = path
        .extname(req.file.originalname)
        .toLowerCase();
      const extensionesPermitidas = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

      if (!extensionesPermitidas.includes(extensionArchivo)) {
        errores.push(
          "Extensión de archivo no permitida. Solo se admiten PDF o imágenes (png, jpg, webp).",
        );
      }

      if (req.file.size > 2 * 1024 * 1024) {
        errores.push("El archivo excede el tamaño máximo permitido de 2 MB.");
      }

      const [archivoExistente] = await db.query(
        `SELECT id FROM archivos WHERE nombreOriginal = ? LIMIT 1`,
        [req.file.originalname],
      );

      if (archivoExistente.length > 0) {
        errores.push(
          `El archivo ${req.file.originalname} ya existe registrado en la base de datos.`,
        );
      }
    }

    // Validar proveedor si viene
    if (proveedor_id) {
      const [proveedor] = await db.query(
        "SELECT id FROM proveedores WHERE id = ?",
        [proveedor_id],
      );
      if (proveedor.length === 0) {
        errores.push("El proveedor seleccionado no existe.");
      }
    }

    // Validar cotizacion si viene (y opcionalmente que sea de la misma sucursal si no admin)
    if (cotizacion_id) {
      const cotizacionIdNum = Number(cotizacion_id);
      if (Number.isNaN(cotizacionIdNum)) {
        errores.push("La cotización seleccionada es inválida.");
      } else {
        const whereSucursalSql = !esAdmin ? " AND sucursal_id = ?" : "";
        const paramsSucursal = !esAdmin ? [sucursalIdUsuario] : [];

        const [cotizacion] = await db.query(
          `SELECT id FROM cotizaciones WHERE id = ? ${whereSucursalSql} LIMIT 1`,
          [cotizacionIdNum, ...paramsSucursal],
        );

        if (cotizacion.length === 0) {
          errores.push(
            "La cotización seleccionada no existe o no pertenece a tu sucursal.",
          );
        }
      }
    }

    // Duplicidad de gasto (mantengo tu lógica)
    const [gastoDuplicado] = await db.query(
      `SELECT id FROM gastos
         WHERE proveedor_id = ?
           AND concepto_pago = ?
           AND subtotal = ?
           AND fecha = ?
           AND sucursal_id = ?
         LIMIT 1`,
      [proveedor_id || null, concepto_pago, subtotal, fecha, sucursal_id],
    );

    if (gastoDuplicado.length > 0) {
      errores.push(
        "Ya existe un gasto registrado con estos datos. Verifica antes de continuar.",
      );
    }
  }

  /*───────────────────────────────
   * VALIDACIONES PARA COTIZACIÓN
   *───────────────────────────────*/
  if (tipo === "cotizacion") {
    const { cliente_id, fecha, detalle } = datosCombinados;

    if (!cliente_id || isNaN(cliente_id)) {
      errores.push("El cliente es obligatorio y debe ser numérico.");
    } else {
      // Traer sucursal del cliente para validar coherencia
      const [clienteRows] = await db.query(
        "SELECT id, sucursal_id FROM clientes WHERE id = ? LIMIT 1",
        [cliente_id],
      );

      if (clienteRows.length === 0) {
        errores.push("El cliente seleccionado no existe.");
      } else {
        const sucursalIdCliente = Number(clienteRows[0].sucursal_id);
        const sucursalIdRegistro = Number(datosCombinados.sucursal_id);

        if (!sucursalIdCliente || Number.isNaN(sucursalIdCliente)) {
          errores.push("El cliente no tiene sucursal asignada.");
        } else {
          // Sucursal del registro debe coincidir con la del cliente
          if (sucursalIdRegistro && sucursalIdRegistro !== sucursalIdCliente) {
            errores.push(
              "La sucursal seleccionada no coincide con la sucursal del cliente.",
            );
          }

          // Si no admin, cliente debe ser de su sucursal (ya forzada)
          if (!esAdmin && sucursalIdRegistro !== sucursalIdCliente) {
            errores.push("El cliente no pertenece a tu sucursal.");
          }
        }
      }
    }

    if (!fecha || isNaN(new Date(fecha).getTime())) {
      errores.push("La fecha de la cotización es inválida.");
    }

    // NO validar total (backend lo calcula). Validar detalle mínimo.
    if (!Array.isArray(detalle) || detalle.length === 0) {
      errores.push("El detalle de la cotización es obligatorio.");
    } else {
      for (let i = 0; i < detalle.length; i++) {
        const item = detalle[i];
        const servicioProductosId = Number(item?.servicio_productos_id);
        const cantidad = Number(item?.cantidad);
        const precioUnitario = Number(item?.precio_unitario);
        const porcentajeIva =
          item?.porcentaje_iva === undefined
            ? 16
            : Number(item?.porcentaje_iva);

        if (!servicioProductosId || Number.isNaN(servicioProductosId)) {
          errores.push(`Detalle[${i}]: servicio_productos_id inválido.`);
          continue;
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          errores.push(`Detalle[${i}]: cantidad inválida.`);
        }
        if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
          errores.push(`Detalle[${i}]: precio_unitario inválido.`);
        }
        if (!Number.isFinite(porcentajeIva) || porcentajeIva < 0) {
          errores.push(`Detalle[${i}]: porcentaje_iva inválido.`);
        }
      }
    }

    // Duplicidad de cotización: dejo suave (solo por cliente y fecha).
    // Si esto te genera falsos positivos, se elimina.
    const [cotizacionDuplicada] = await db.query(
      `SELECT id FROM cotizaciones
         WHERE cliente_id = ?
           AND fecha = ?
         LIMIT 1`,
      [cliente_id, fecha],
    );

    if (cotizacionDuplicada.length > 0) {
      errores.push(
        "Ya existe una cotización registrada para este cliente en la misma fecha.",
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
  return next();
};
