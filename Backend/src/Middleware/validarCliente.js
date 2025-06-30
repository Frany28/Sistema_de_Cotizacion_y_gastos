import db from "../config/database.js";

export const validarCliente = async (req, res, next) => {
  const { nombre, email, telefono, direccion, identificacion } = req.body;

  const regexNombre = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
  const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const regexTelefono = /^[0-9]{10}$/;
  const regexIdentificacion = /^[VE][0-9]{5,10}$/; 

  const errores = [];

  // Campos obligatorios
  if (!nombre) errores.push("El nombre es obligatorio.");
  if (!email) errores.push("El email es obligatorio.");
  if (!telefono) errores.push("El teléfono es obligatorio.");
  if (!direccion) errores.push("La dirección es obligatoria.");
  if (!identificacion) errores.push("La identificación es obligatoria.");

  // Validaciones de formato
  if (nombre && !regexNombre.test(nombre)) {
    errores.push("El nombre solo puede contener letras y espacios.");
  }

  if (email && !regexEmail.test(email)) {
    errores.push("Formato de email inválido.");
  }

  if (telefono && !regexTelefono.test(telefono)) {
    errores.push("El teléfono debe tener 10 dígitos numéricos.");
  }

  if (identificacion && !regexIdentificacion.test(identificacion)) {
    errores.push("Identificación debe ser V o E seguida de 5-10 dígitos.");
  }

  if (errores.length > 0) {
    return res.status(422).json({
      message: "Error de validación.",
      errores,
    });
  }

  // ✅ Validar existencia en BD
  try {
    const [clientes] = await db.query(
      `SELECT id, nombre, identificacion, email 
       FROM clientes 
       WHERE identificacion = ? OR email = ?`,
      [identificacion.trim(), email.trim()]
    );

    const erroresDuplicados = [];

    for (const cliente of clientes) {
      if (cliente.identificacion === identificacion.trim()) {
        erroresDuplicados.push(
          `Ya existe un cliente con la identificación ${identificacion.trim()}.`
        );
      }
      if (cliente.email === email.trim()) {
        erroresDuplicados.push(
          `Ya existe un cliente con el email ${email.trim()}.`
        );
      }
    }

    if (erroresDuplicados.length > 0) {
      return res.status(409).json({
        message: "Conflicto de datos.",
        errores: erroresDuplicados,
      });
    }

    next();
  } catch (error) {
    console.error("Error en validarCliente:", error);
    return res.status(500).json({
      message: "Error interno al validar cliente.",
      error: error.message,
    });
  }
};
