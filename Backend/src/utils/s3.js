// utils/s3.js
// AWS SDK v3 + multer-s3
// Estructura resultante en el bucket:
//
//   firmas/AAAA/...                     ← firmas de usuarios
//  facturas_gastos/AAAA/...               ← facturas / comprobantes de GASTOS
//   comprobantes_solicitudes/AAAA/...   ← comprobantes de ÓRDENES de pago
//
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

/*────────────────────  Factory de uploaders  ──────────*/
const makeUploader = ({ folder, maxSizeMb, allowPdf = false }) =>
  multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET,
      acl: "private",
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => {
        const year = new Date().getFullYear(); // sub-carpeta por año
        const safeName = file.originalname.replace(/\s+/g, "_");
        cb(null, `${folder}/${year}/${Date.now()}-${safeName}`);
      },
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (allowPdf) allowedTypes.push("application/pdf");
      if (allowedTypes.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Tipo de archivo no permitido"));
    },
    preservePath: true,
  });

/*────────────────────  Uploaders exportados  ──────────*/

// Firmas de usuarios (solo imágenes)
export const uploadFirma = makeUploader({
  folder: "firmas",
  maxSizeMb: 5,
});

// Comprobantes / facturas de GASTOS
export const uploadComprobante = makeUploader({
  folder: "facturas_gastos",
  maxSizeMb: 8,
  allowPdf: true,
});


//comprobantes de pagos realizados
export const uploadComprobantePago = makeUploader({
  folder: "comprobantes_pagos",
  maxSizeMb: 8,
  allowPdf: true,
});

// Comprobantes de ABONOS (CXC)
export const uploadComprobanteAbono = makeUploader({
  folder: "cxcAbonos", 
  maxSizeMb: 8,
  allowPdf: true,
});
