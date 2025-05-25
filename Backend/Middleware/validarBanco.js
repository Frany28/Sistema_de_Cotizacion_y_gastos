// Middleware/validarBanco.js
import { check, validationResult } from "express-validator";

export const validarBanco = [
  // nombre es obligatorio
  check("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre del banco es obligatorio"),

  // moneda debe ser 'VES' o 'USD'
  check("moneda")
    .isIn(["VES", "USD"])
    .withMessage("La moneda debe ser 'VES' o 'USD'"),

  // tipo_identificador: 'nro_cuenta' o 'email'
  check("tipo_identificador")
    .isIn(["nro_cuenta", "email"])
    .withMessage("El tipo debe ser 'nro_cuenta' o 'email'"),

  // identificador: dependiendo del tipo
  check("identificador")
    .trim()
    .notEmpty()
    .withMessage("El identificador es obligatorio")
    .bail()
    .custom((valor, { req }) => {
      if (req.body.tipo_identificador === "email") {
        // validar formato email
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(valor)) {
          throw new Error("Identificador debe ser un email válido");
        }
      } else {
        // validar solo dígitos para cuenta
        const accountRegex = /^[0-9]+$/;
        if (!accountRegex.test(valor)) {
          throw new Error("Identificador debe contener solo números");
        }
      }
      return true;
    }),

  // estado opcional, por defecto 'activo'
  check("estado")
    .optional()
    .isIn(["activo", "inactivo"])
    .withMessage("El estado debe ser 'activo' o 'inactivo'"),

  // manejar errores de validación
  (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }
    next();
  },
];
