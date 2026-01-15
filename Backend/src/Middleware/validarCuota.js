// Backend/src/Middleware/validarCuota.js
import { tieneEspacio } from "../services/cuotaService.js";

/**
 * Middleware: valida si el usuario autenticado tiene espacio suficiente
 * para subir el archivo que viene en req.file (multer/s3).
 *
 * Requisitos:
 * - Debe ejecutarse DESPUÉS de autenticarUsuario (para tener req.user)
 * - Normalmente se usa en rutas con upload.single("archivo") o similar
 */
export const validarCuota = async (req, res, next) => {
  try {
    // 1) Validar autenticación mínima
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ mensaje: "No autenticado." });
    }

    // 2) Si no viene archivo, no hay nada que validar
    const pesoBytes = Number(req.file?.size ?? 0);

    if (!pesoBytes || !Number.isFinite(pesoBytes) || pesoBytes < 0) {
      return next();
    }

    // 3) Opción 1: el service consulta la BD y valida cuota
    const ok = await tieneEspacio(usuarioId, pesoBytes);

    if (!ok) {
      return res.status(413).json({
        mensaje:
          "Has superado tu cuota de almacenamiento. Elimina archivos o solicita más espacio.",
      });
    }

    return next();
  } catch (error) {
    if (error?.message === "usuarioNoEncontrado") {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    console.error("Error en validarCuota:", error);
    return res.status(500).json({
      mensaje: "Error interno al validar cuota de almacenamiento.",
    });
  }
};

export default validarCuota;
