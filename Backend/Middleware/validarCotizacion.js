export const validarCotizacion = (req, res, next) => {
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

  // Validaciones generales
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

  // Validaciones de operación (para servicios o productos)
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

  // Validación de detalle de cotización
  if (!Array.isArray(detalle) || detalle.length === 0) {
    errors.push("Debes incluir al menos un ítem en 'detalle'.");
  } else {
    detalle.forEach((item, index) => {
      if (!item.servicio_productos_id || isNaN(item.servicio_productos_id)) {
        errors.push(
          `Ítem ${
            index + 1
          }: 'servicio_productos_id' es requerido y debe ser numérico.`
        );
      }
      if (!item.cantidad || isNaN(item.cantidad) || item.cantidad <= 0) {
        errors.push(
          `Ítem ${index + 1}: 'cantidad' es requerida y debe ser mayor a 0.`
        );
      }
      if (item.precio_unitario === undefined || isNaN(item.precio_unitario)) {
        errors.push(
          `Ítem ${
            index + 1
          }: 'precio_unitario' es requerido y debe ser numérico.`
        );
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};
