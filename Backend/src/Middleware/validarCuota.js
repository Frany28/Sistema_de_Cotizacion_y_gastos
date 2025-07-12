// middlewares/validarCuota.js
import { tieneEspacio } from "../config/database.js";

/**
 * Bloquea la petición si el archivo a subir excede la cuota del usuario.
 * • req.user.id   → lo coloca autenticarUsuario
 * • req.file.size → lo rellena Multer (uploadComprobanteMemoria)
 * • También acepta headers/body para flujos que firman URL primero.
 */
export const validarCuota = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;

    // 1) Detecta tamaño de archivo según el flujo
    const pesoBytes = Number(
      req.headers["x-file-size"] ?? // presigned-URL
        req.body?.pesoBytes ?? // fetch JSON
        req.file?.size ?? // multipart (Multer)
        0
    );

    // 2) Si no hay archivo, deja pasar
    if (!pesoBytes) return next();

    // 3) Valida cuota
    const ok = await tieneEspacio(usuarioId, pesoBytes);
    if (!ok) {
      return res.status(413).json({
        mensaje:
          "Has superado tu cuota de almacenamiento. Elimina archivos o solicita más espacio.",
      });
    }

    return next(); 
  } catch (error) {
    return next(error);
  }
};
