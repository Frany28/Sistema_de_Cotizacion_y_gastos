export const validarServicioProducto = (req, res, next) => {
  const {
    nombre,
    descripcion,
    precio,
    tipo,
    porcentaje_iva,
    cantidad_actual,
    cantidad_anterior,
    estado,
  } = req.body;

  const errores = [];

  if (!nombre || !descripcion || precio == null || !tipo) {
    errores.push("Todos los campos básicos son obligatorios.");
  }

  if (nombre) {
    if (nombre.length < 3 || nombre.length > 100) {
      errores.push("El nombre debe tener entre 3 y 100 caracteres.");
    }
  }

  if (descripcion) {
    if (descripcion.length < 5 || descripcion.length > 255) {
      errores.push("La descripción debe tener entre 5 y 255 caracteres.");
    }
  }

  if (typeof precio !== "number" || precio <= 0) {
    errores.push("El precio debe ser un número positivo.");
  } else if (precio > 999999.99) {
    errores.push("El precio no puede exceder 999.999,99.");
  }

  if (!["servicio", "producto"].includes(tipo)) {
    errores.push("El tipo debe ser 'servicio' o 'producto'.");
  }

  const ivaValidos = [0, 8, 16];
  if (porcentaje_iva == null || isNaN(porcentaje_iva)) {
    errores.push("El porcentaje de IVA es obligatorio y debe ser numérico.");
  } else if (!ivaValidos.includes(Number(porcentaje_iva))) {
    errores.push("El porcentaje de IVA debe ser 0, 8 o 16.");
  }

  if (estado && !["activo", "inactivo"].includes(estado)) {
    errores.push("Estado inválido (activo o inactivo).");
  }

  if (tipo === "producto") {
    if (
      cantidad_actual == null ||
      cantidad_anterior == null ||
      typeof cantidad_actual !== "number" ||
      typeof cantidad_anterior !== "number" ||
      cantidad_actual < 0 ||
      cantidad_anterior < 0
    ) {
      errores.push(
        "Los productos deben tener cantidades válidas (actual y anterior)."
      );
    }
  }

  if (errores.length > 0) {
    return res.status(422).json({
      message: "Error de validación.",
      errores,
    });
  }

  next();
};
