import db from "../config/database.js";

export const registrarAbono = async (req, res) => {
  const { cuenta_id } = req.params;
  const { monto, moneda, tasa_cambio, observaciones } = req.body;
  const usuarioId = req.user.id;
  const rutaComprobante = req.file ? req.file.key : null;

  try {
    // 1) Insertar el abono con los nombres de columna correctos
    const [insertResult] = await db.query(
      `INSERT INTO abonos_cuentas
         (cuenta_id,
          moneda_pago,
          tasa_cambio,
          monto_abonado,
          monto_usd_calculado,
          ruta_comprobante,
          fecha_abono,
          observaciones,
          empleado_id)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        cuenta_id,
        moneda, // moneda_pago
        parseFloat(tasa_cambio) || 1, // tasa_cambio
        parseFloat(monto), // monto_abonado
        parseFloat(monto) * (moneda === "VES" ? parseFloat(tasa_cambio) : 1), // monto_usd_calculado
        rutaComprobante, // ruta_comprobante
        observaciones || null, // observaciones
        usuarioId, // empleado_id
      ]
    );
    const abonoId = insertResult.insertId;

    // 2) Si se subió comprobante, registrar en archivos y eventos
    if (rutaComprobante) {
      const [aRes] = await db.query(
        `INSERT INTO archivos
           (registroTipo, registroId, nombreOriginal, extension, rutaS3, subidoPor, creadoEn, actualizadoEn)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          "abonosCXC",
          abonoId,
          req.file.originalname,
          req.file.originalname.split(".").pop(),
          rutaComprobante,
          usuarioId,
        ]
      );
      const archivoId = aRes.insertId;

      await db.query(
        `INSERT INTO eventosArchivo
           (archivoId, accion, usuarioId, fechaHora, ip, userAgent, detalles)
         VALUES (?, 'subida', ?, NOW(), ?, ?, ?)`,
        [
          archivoId,
          usuarioId,
          req.ip || null,
          req.get("user-agent") || null,
          JSON.stringify({
            nombre: req.file.originalname,
            ruta: rutaComprobante,
          }),
        ]
      );
    }

    return res.status(201).json({
      message: "Abono registrado correctamente",
      abono_id: abonoId,
      rutaComprobante,
    });
  } catch (error) {
    console.error("Error al registrar abono:", error);
    return res
      .status(500)
      .json({ message: "Error interno al registrar abono" });
  }
};
