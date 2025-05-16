// middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error("Error capturado: ", {
    message: err.message,
    stack: err.stack,
    ruta: req.originalUrl,
    metodo: req.method,
  });

  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
  });
};

