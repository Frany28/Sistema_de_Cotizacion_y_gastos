export const validarCliente = (req, res, next) => {
  const { nombre, email, telefono, direccion, identificacion } = req.body;

  const regexNombre = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
  const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const regexTelefono = /^[0-9]{10}$/;
  const regexIdentificacion = /^[VE][0-9]{5,10}$/; // V12345678 o E98765432

  if (!nombre || !email || !telefono || !direccion || !identificacion) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  if (!regexNombre.test(nombre)) {
    return res.status(400).json({
      message: "El nombre solo puede contener letras y espacios",
    });
  }

  if (!regexEmail.test(email)) {
    return res.status(400).json({ message: "Formato de email inválido" });
  }

  if (!regexTelefono.test(telefono)) {
    return res.status(400).json({
      message: "El teléfono debe tener 10 dígitos numéricos",
    });
  }

  if (!regexIdentificacion.test(identificacion)) {
    return res.status(400).json({
      message: "Identificación debe ser V o E seguida de 5-10 dígitos",
    });
  }

  next();
};
