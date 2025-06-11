// middlewares/validarSucursal.js
export const validarSucursal = (req, res, next) => {
  const {
    codigo,
    nombre,
    direccion,
    ciudad,
    estado_provincia,
    pais,
    telefono,
    email,
    responsable,
  } = req.body;

  // Expresiones regulares para validación
  const regexCodigo = /^[A-Z0-9]{2,10}$/; // Código alfanumérico en mayúsculas, 2-10 caracteres
  const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-0-9]+$/; // Letras, números, espacios, guiones
  const regexTelefono = /^\+?[0-9\s-]{7,15}$/; // Números, espacios, guiones, + opcional
  const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Campos obligatorios
  if (!codigo || !nombre || !direccion) {
    return res.status(400).json({
      message: "Código, nombre y dirección son campos obligatorios",
      detalles: {
        codigo: !codigo ? "Falta el código" : null,
        nombre: !nombre ? "Falta el nombre" : null,
        direccion: !direccion ? "Falta la dirección" : null,
      },
    });
  }

  // Validaciones específicas
  const errores = {};

  if (!regexCodigo.test(codigo)) {
    errores.codigo =
      "El código debe contener solo letras mayúsculas y números (2-10 caracteres)";
  }

  if (!regexNombre.test(nombre)) {
    errores.nombre =
      "El nombre solo puede contener letras, números, espacios y guiones";
  }

  if (telefono && !regexTelefono.test(telefono)) {
    errores.telefono = "Formato de teléfono inválido (ej: +58 212 5551234)";
  }

  if (email && !regexEmail.test(email)) {
    errores.email = "Formato de email inválido";
  }

  // Si hay errores, retornarlos
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({
      message: "Errores de validación",
      errores,
    });
  }

  // Sanitización: trim() a todos los campos de texto
  req.body = {
    codigo: codigo.trim(),
    nombre: nombre.trim(),
    direccion: direccion.trim(),
    ciudad: ciudad ? ciudad.trim() : null,
    estado_provincia: estado_provincia ? estado_provincia.trim() : null,
    pais: pais ? pais.trim() : null,
    telefono: telefono ? telefono.trim() : null,
    email: email ? email.trim() : null,
    responsable: responsable ? responsable.trim() : null,
  };

  next();
};
