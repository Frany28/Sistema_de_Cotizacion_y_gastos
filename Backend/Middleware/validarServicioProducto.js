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

  if (!nombre || !descripcion || precio == null || !tipo) {
    return res
      .status(400)
      .json({ message: "Todos los campos básicos son obligatorios" });
  }

  if (typeof precio !== "number" || precio <= 0) {
    return res
      .status(400)
      .json({ message: "El precio debe ser un número positivo" });
  }

  if (!["servicio", "producto"].includes(tipo)) {
    return res
      .status(400)
      .json({ message: "El tipo debe ser 'servicio' o 'producto'" });
  }

  if (porcentaje_iva == null || isNaN(porcentaje_iva)) {
    return res.status(400).json({
      message: "El porcentaje de IVA es obligatorio y debe ser numérico",
    });
  }

  if (porcentaje_iva < 0 || porcentaje_iva > 16) {
    return res
      .status(400)
      .json({ message: "El porcentaje de IVA debe ser 0, 8 o 16" });
  }

  if (estado && !["activo", "inactivo"].includes(estado)) {
    return res
      .status(400)
      .json({ message: "Estado inválido (activo o inactivo)" });
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
      return res.status(400).json({
        message:
          "Los productos deben tener cantidades válidas (actual y anterior)",
      });
    }
  }

  next();
};
