// utils/s3.js
// Gestión de uploads a S3 con AWS SDK v3 y multer-s3

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
dotenv.config();

/*──────────────────── Cliente S3 ────────────────────*/
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/*───────────────── URL pre-firmada para GET ─────────*/
export async function generarUrlPrefirmadaLectura(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/*─────────────────── makeUploader genérico ───────────*/
export function makeUploader({ folder, maxSizeMb = 5, allowPdf = false }) {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET,
      acl: "private",
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => {
        const now = new Date();
        const year = now.getFullYear();
        const monthName = now
          .toLocaleString("default", { month: "long" })
          .toLowerCase();
        const safeName = file.originalname.replace(/\s+/g, "_");
        const timestamp = Date.now();
        const key = `${folder}/${year}/${monthName}/${timestamp}-${safeName}`;
        cb(null, key);
      },
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        if (allowPdf) cb(null, true);
        else cb(new Error("Archivos PDF no permitidos"));
      } else {
        cb(null, true);
      }
    },
  });
}

/*────────────────── Upload específico de firmas ───────*/
export const uploadFirma = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "private",
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      // Usar el nombre del usuario a crear (req.body.nombre)
      const nombreUsuario = req.body.nombre
        ? req.body.nombre.trim().replace(/\s+/g, "_")
        : `usuario_${Date.now()}`;
      const extension = file.originalname.split(".").pop();
      const fileName = `firma.${extension}`;
      const key = `firmas/${nombreUsuario}/${fileName}`;
      cb(null, key);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (req, file, cb) => {
    const permitidos = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (permitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido para firma"));
    }
  },
});

/*────────────────── Uploaders para otros tipos ───────*/
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
  folder: "abonos_cxc",
  maxSizeMb: 8,
  allowPdf: true,
});
