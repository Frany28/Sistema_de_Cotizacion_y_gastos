// controllers/registroArchivo.controller.js
import path from "path";
import db from "../config/database.js";

export const subirComprobanteGasto = async (req, res) => {
  try {
    const idGasto = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ message: "No se recibió ningún archivo" });
    }

    // Datos del archivo en S3
    const rutaS3 = req.file.key;
    const nombreOriginal = req.file.originalname;
    const extension = path.extname(nombreOriginal).substring(1);

    // 1) Registrar en tabla 'archivos'
    const [resArchivo] = await db.query(
      `INSERT INTO archivos
         (registroTipo, registroId, nombreOriginal, extension, rutaS3, subidoPor, creadoEn, actualizadoEn)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        "facturasGastos",
        idGasto,
        nombreOriginal,
        extension,
        rutaS3,
        req.usuario.id,
      ]
    );
    const idArchivo = resArchivo.insertId;

    // 2) Registrar evento en 'eventosArchivo'
    await db.query(
      `INSERT INTO eventosArchivo
         (archivoId, accion, usuarioId, fechaHora, ip, userAgent, detalles)
       VALUES (?, 'subida', ?, NOW(), ?, ?, ?)`,
      [
        idArchivo,
        req.usuario.id,
        req.ip || null,
        req.get("user-agent") || null,
        JSON.stringify({ nombreOriginal, extension, rutaS3 }),
      ]
    );

    return res.status(201).json({
      message: "Comprobante subido con éxito",
      idArchivo,
      rutaS3,
    });
  } catch (error) {
    console.error("Error en subirComprobanteGasto:", error);
    return res
      .status(500)
      .json({ message: "Error al subir comprobante de gasto" });
  }
};
