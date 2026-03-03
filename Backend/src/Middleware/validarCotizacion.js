export const validarCotizacion = (req, res, next) => {
  // ---------------------------------------------------------------------------
  // Restricción por sucursal (según BD)
  // - Admin: rol_id === 1 => debe enviar sucursal_id en el body
  // - No admin: se fuerza sucursal_id = req.user.sucursal_id
  // ---------------------------------------------------------------------------
  const rolId = Number(req.user?.rol_id);
  const esAdmin = rolId === 1;

  if (!esAdmin) {
    const sucursalIdUsuario = Number(req.user?.sucursal_id);
    if (!sucursalIdUsuario || Number.isNaN(sucursalIdUsuario)) {
      return res.status(403).json({
        errors: ["Tu usuario no tiene sucursal asignada."],
      });
    }
    // Forzar sucursal del usuario (ignorar lo que mande el frontend)
    req.body.sucursal_id = sucursalIdUsuario;
  } else {
    const sucursalIdBody = Number(req.body?.sucursal_id);
    if (!sucursalIdBody || Number.isNaN(sucursalIdBody)) {
      return res.status(400).json({
        errors: [
          "El campo 'sucursal_id' es requerido para admin y debe ser numérico.",
        ],
      });
    }
  }

  const {
    cliente_id,
    sucursal_id,
    estado = "pendiente",
    detalle,
    operacion,
    puerto,
    bl,
    mercancia,
    contenedor,
    observaciones,
  } = req.body;

  const errors = [];

  if (!cliente_id || isNaN(cliente_id)) {
    errors.push("El campo 'cliente_id' es requerido y debe ser numérico.");
  }

  if (sucursal_id !== undefined && sucursal_id !== null && isNaN(sucursal_id)) {
    errors.push("El campo 'sucursal_id' debe ser numérico si se incluye.");
  }

  const estadosValidos = ["pendiente", "aprobada", "rechazada"];
  if (!estadosValidos.includes(estado)) {
    errors.push("El campo 'estado' no es válido.");
  }

  if (!operacion || typeof operacion !== "string") {
    errors.push("El campo 'operacion' es requerido y debe ser texto.");
  }
  if (!puerto || typeof puerto !== "string") {
    errors.push("El campo 'puerto' es requerido y debe ser texto.");
  }
  if (!bl || typeof bl !== "string") {
    errors.push("El campo 'bl' es requerido y debe ser texto.");
  }
  if (!mercancia || typeof mercancia !== "string") {
    errors.push("El campo 'mercancia' es requerido y debe ser texto.");
  }
  if (!contenedor || typeof contenedor !== "string") {
    errors.push("El campo 'contenedor' es requerido y debe ser texto.");
  }
  if (observaciones !== undefined && typeof observaciones !== "string") {
    errors.push("El campo 'observaciones' debe ser texto si se incluye.");
  }

  if (!Array.isArray(detalle) || detalle.length === 0) {
    errors.push("Debes incluir al menos un ítem en 'detalle'.");
  } else {
    detalle.forEach((item, index) => {
      if (!item.servicio_productos_id || isNaN(item.servicio_productos_id)) {
        errors.push(
          `Ítem ${index + 1}: 'servicio_productos_id' es requerido y debe ser numérico.`,
        );
      }
      if (!item.cantidad || isNaN(item.cantidad) || item.cantidad <= 0) {
        errors.push(
          `Ítem ${index + 1}: 'cantidad' es requerida y debe ser mayor a 0.`,
        );
      }
      if (item.precio_unitario === undefined || isNaN(item.precio_unitario)) {
        errors.push(
          `Ítem ${index + 1}: 'precio_unitario' es requerido y debe ser numérico.`,
        );
      }
    });
  }

  if (errors.length > 0) return res.status(400).json({ errors });
  next();
};
