const validarDestinoRepositorio = (req, res, next) => {
  const carpetaId = req.body?.carpetaId ? Number(req.body.carpetaId) : null;
  const prefijoS3 = req.body?.prefijoS3
    ? String(req.body.prefijoS3).trim()
    : null;

  if (carpetaId && prefijoS3) {
    return res.status(400).json({
      mensaje: "Envía solo carpetaId o prefijoS3, no ambos.",
    });
  }

  if (!carpetaId && !prefijoS3) {
    return res.status(400).json({
      mensaje: "Debes enviar carpetaId o prefijoS3.",
    });
  }

  next();
};
