export const obtenerTamanoTotalVersiones = async (req, res) => {
  const archivoId = Number(req.params.id);
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  try {
    const [[registro]] = await db.query(
      "SELECT subidoPor FROM archivos WHERE id = ?",
      [archivoId]
    );

    if (!registro) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    if (
      ![ROL_ADMIN, ROL_SUPERVISOR].includes(rolId) &&
      registro.subidoPor !== usuarioId
    ) {
      return res.status(403).json({ message: "Acceso denegado." });
    }

    const [[{ totalTamano }]] = await db.query(
      `SELECT COALESCE(SUM(tamanoBytes), 0) AS totalTamano
       FROM versionesArchivo
       WHERE archivoId = ?`,
      [archivoId]
    );

    return res.json({ totalTamano });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error al obtener el tamaño total de versiones." });
  }
};
