// middlewares/validarCliente.js
import db from "../config/database.js";

export const validarCliente = async (req, res, next) => {
  const { nombre, email, telefono, direccion, identificacion } = req.body;
  const idEnRuta = req.params?.id ? Number(req.params.id) : null;

  /* 1. Validaciones de formato ------------------------------------------- */
  const regexNombre = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
  const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const regexTelefono = /^[0-9]{7,15}$/; // ← admite distintos países
  const regexIdentif = /^[VE][0-9]{5,10}$/;

  const errores = [];

  // Campos obligatorios
  if (!nombre) errores.push("El nombre es obligatorio.");
  if (!email) errores.push("El email es obligatorio.");
  if (!telefono) errores.push("El teléfono es obligatorio.");
  if (!direccion) errores.push("La dirección es obligatoria.");
  if (!identificacion) errores.push("La identificación es obligatoria.");

  // Formato
  if (nombre && !regexNombre.test(nombre))
    errores.push("El nombre solo puede contener letras y espacios.");
  if (email && !regexEmail.test(email))
    errores.push("Formato de email inválido.");
  if (telefono && !regexTelefono.test(telefono))
    errores.push("Teléfono inválido (7-15 dígitos).");
  if (identificacion && !regexIdentif.test(identificacion))
    errores.push("Identificación: V/E + 5-10 dígitos.");

  if (errores.length) {
    return res.status(422).json({ message: "Error de validación", errores });
  }

  /* 2. Verificar duplicados ---------------------------------------------- */
  try {
    const conds = ["(identificacion = ? OR email = ?)"];
    const params = [identificacion.trim(), email.trim()];

    // Si estoy actualizando, excluyo mi propio registro
    if (idEnRuta) {
      conds.push("id <> ?");
      params.push(idEnRuta);
    }

    const [dup] = await db.execute(
      `SELECT id FROM clientes WHERE ${conds.join(" AND ")}`,
      params
    );

    if (dup.length) {
      return res.status(409).json({
        message: "Conflicto de datos únicos",
        errores: [
          ...(dup.some((r) => r.id)
            ? ["Email o identificación ya registrados."]
            : []),
        ],
      });
    }

    next();
  } catch (e) {
    console.error("Error en validarCliente:", e);
    return res.status(500).json({ message: "Error interno en validación" });
  }
};
