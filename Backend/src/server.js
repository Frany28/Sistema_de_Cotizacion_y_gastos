// backend/src/utils/s3.js
import dotenv from "dotenv";
dotenv.config(); // ① Cargamos las variables de entorno al inicio

import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

// ② Constantes en camelCase y español
const awsRegión = process.env.AWS_REGION || "us-east-2";
const awsBucketNombre = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET; // ③ Fallback

if (!awsBucketNombre) {
  throw new Error(
    "Falta AWS_BUCKET_NAME (o S3_BUCKET) en las variables de entorno"
  );
}

// ④ Cliente S3
export const clienteS3 = new S3Client({
  region: awsRegión,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ⑤ Configuración de subida con multer-s3
export const subirArchivo = multer({
  storage: multerS3({
    s3: clienteS3,
    bucket: awsBucketNombre,
    acl: "private",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const nombreArchivo = `${Date.now()}_${file.originalname}`;
      cb(null, `uploads/${nombreArchivo}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});
