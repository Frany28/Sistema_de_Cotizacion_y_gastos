export const validarProveedor = (req, res, next) => {
  const { nombre, email, telefono, direccion, rif, estado } = req.body;
  const regexEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  const regexTelefono = /^[0-9]{10}$/;
  const regexRif = /^J-\d{9}$/;
  const estadosValidos = ["activo", "inactivo"];

  if (!nombre || !email || !telefono || !direccion || !rif || !estado) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  if (!regexEmail.test(email)) {
    return res.status(400).json({ message: "Formato de email inválido" });
  }

  if (!regexTelefono.test(telefono)) {
    return res
      .status(400)
      .json({ message: "El teléfono debe tener 10 dígitos numéricos" });
  }

  if (!regexRif.test(rif)) {
    return res
      .status(400)
      .json({ message: "El RIF debe tener formato J-XXXXXXXXX" });
  }

  if (!estadosValidos.includes(estado)) {
    return res
      .status(400)
      .json({ message: "Estado inválido. Debe ser 'activo' o 'inactivo'" });
  }

  next();
};
