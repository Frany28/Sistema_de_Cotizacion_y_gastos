// middlewares/uploadUsuario.js

import multer from "multer";

// 1) Configuramos multer para almacenamiento en memoria
const storage = multer.memoryStorage();

export const uploadUsuario = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // por ejemplo, máximo 5MB
  },
});
