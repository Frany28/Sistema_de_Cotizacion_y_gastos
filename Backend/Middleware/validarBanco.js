// Middleware/validarBanco.js
export const validarBanco = (req, res, next) => {
  const { nombre, moneda, tipo_identificador, identificador, estado } =
    req.body;

  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // 1) Campos obligatorios
  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  if (
    !nombre ||
    !moneda ||
    !tipo_identificador ||
    !identificador
    // 'estado' lo dejamos opcional: si no llega, asumimos 'activo'
  ) {
    return res.status(400).json({
      message:
        "Los campos nombre, moneda, tipo_identificador e identificador son obligatorios.",
    });
  }

  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // 2) Validar 'nombre'
  // Sólo letras (incluye tildes y ñ) y espacios
  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ\s]+$/;
  if (!regexNombre.test(nombre.trim())) {
    return res
      .status(400)
      .json({ message: "El nombre sólo puede contener letras y espacios." });
  }

  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // 3) Validar 'moneda'
  // Debe ser exactamente 'VES' o 'USD'
  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  const monedasValidas = ["VES", "USD"];
  if (!monedasValidas.includes(moneda)) {
    return res
      .status(400)
      .json({ message: "La moneda debe ser 'VES' o 'USD'." });
  }

  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // 4) Validar 'tipo_identificador'
  // Debe ser 'nro_cuenta' o 'email'
  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  const tiposValidos = ["nro_cuenta", "email"];
  if (!tiposValidos.includes(tipo_identificador)) {
    return res.status(400).json({
      message: "El tipo_identificador debe ser 'nro_cuenta' o 'email'.",
    });
  }

  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // 5) Validar 'identificador' según su tipo
  // - Si es 'email', usamos regex de email
  // - Si es 'nro_cuenta', sólo números
  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  if (tipo_identificador === "email") {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(identificador.trim())) {
      return res
        .status(400)
        .json({ message: "El identificador debe ser un email válido." });
    }
  } else {
    const regexCuenta = /^[0-9]+$/;
    if (!regexCuenta.test(identificador.trim())) {
      return res
        .status(400)
        .json({ message: "El identificador debe contener sólo dígitos." });
    }
  }

  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  // 6) Validar 'estado' (opcional)
  // Puede llegar 'activo' o 'inactivo'; si no viene, lo asumimos 'activo'
  // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  if (estado) {
    const estadosValidos = ["activo", "inactivo"];
    if (!estadosValidos.includes(estado)) {
      return res
        .status(400)
        .json({ message: "El estado debe ser 'activo' o 'inactivo'." });
    }
  }

  // Si todo OK, dejamos que la petición siga a tu controlador
  next();
};
