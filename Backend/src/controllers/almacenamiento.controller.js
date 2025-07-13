import db from "../config/database.js";

/**
 * GET /api/almacenamiento/mi-uso
 * Devuelve { cuotaMb, usadoMb, disponibleMb, porcentajeUso }
 */
export const obtenerUsoAlmacenamiento = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // 1) Traemos cuota y uso actuales
    const [[usuario]] = await db.query(
      "SELECT cuotaMb, usoStorageBytes FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // 2) Cálculos
    const usadoMb = +(usuario.usoStorageBytes / 1_048_576).toFixed(2);
    const cuotaMb = usuario.cuotaMb;
    const disponibleMb =
      cuotaMb !== null ? +Math.max(cuotaMb - usadoMb, 0).toFixed(2) : null;
    const porcentajeUso =
      cuotaMb !== null ? +((usadoMb / cuotaMb) * 100).toFixed(2) : null;

    // 3) Respuesta
    return res.json({
      cuotaMb,
      usadoMb,
      disponibleMb,
      porcentajeUso,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ mensaje: "Error interno al consultar almacenamiento" });
  }
};
