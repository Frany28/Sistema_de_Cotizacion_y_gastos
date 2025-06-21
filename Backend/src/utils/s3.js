// utils/s3.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
dotenv.config();

/*────────────────────  Cliente S3  ────────────────────*/
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/*────────────────────  URL pre-firmada  ───────────────*/
export async function generarUrlPrefirmadaLectura(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/*────────────────────  Upload de firmas  ──────────────*/
export const uploadFirma = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "private",
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      // 1) Obtenemos el nombre del usuario que estamos creando
      const nombreUsuario = req.body.nombre
        ? req.body.nombre.trim().replace(/\s+/g, "_")
        : `sin_nombre_${Date.now()}`;

      // 2) Construimos la key fija "firma.<ext>"
      const extension = file.originalname.split(".").pop();
      const fileName = `firma.${extension}`;

      // 3) Generamos ruta: firmas/<nombreUsuarioCreado>/firma.ext
      const key = `firmas/${nombreUsuario}/${fileName}`;

      cb(null, key);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido para firma"));
    }
  },
});

/*────────────────────  Uploaders exportados  ──────────*/

export const uploadComprobante = makeUploader({
  folder: "facturas_gastos",
  maxSizeMb: 8,
  allowPdf: true,
});

export const uploadComprobantePago = makeUploader({
  folder: "comprobantes_pagos",
  maxSizeMb: 8,
  allowPdf: true,
});

export const uploadComprobanteAbono = makeUploader({
  folder: "Abonos_cxc",
  maxSizeMb: 8,
  allowPdf: true,
});
