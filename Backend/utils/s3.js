// utils/s3.js

import AWS from "aws-sdk";
import dotenv from "dotenv";
dotenv.config(); // Carga las variables de entorno

// 1) Configurar AWS con las credenciales y región de tu .env
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// 2) Crear la instancia de S3
export const s3 = new AWS.S3();

/**
 * Genera una URL prefirmada para GET (lectura) de un objeto privado en S3.
 * @param {string} key – la “key” o ruta interna en S3 (e.g. 'comprobantes/16540-factura.png')
 * @param {number} expiresInSeconds – segundos que la URL será válida (300 = 5 min)
 * @returns {string} – URL firmada para que el navegador la use
 */
export function generarUrlPrefirmadaLectura(key, expiresInSeconds = 300) {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: expiresInSeconds,
  };
  return s3.getSignedUrl("getObject", params);
}

// 3) Configurar multer + multer-s3 para subir comprobantes
import multer from "multer";
import multerS3 from "multer-s3";

export const uploadComprobante = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    acl: "private", // dejamos el objeto privado
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      // Guardamos dentro de carpeta 'comprobantes/' + timestamp + nombre original
      const nombreUnico = Date.now().toString() + "-" + file.originalname;
      cb(null, `comprobantes/${nombreUnico}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // límite 5 MB (ajústalo si es necesario)
  fileFilter: (req, file, cb) => {
    // Solo permitir archivos tipo imagen
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de tipo imagen"), false);
    }
  },
});
