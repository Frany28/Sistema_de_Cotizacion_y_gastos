// utils/s3.js
// Gestión de uploads a S3 con AWS SDK v3 y multer-s3

import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

/*─────────────────── Mover archivo a papelera ─────────*/
export async function moverArchivoAS3AlPapelera(
  keyAntiguo,
  registroTipo,
  registroId
) {
  const ahora = new Date();
  const stamp = ahora.toISOString().replace(/[:.]/g, "-");
  const nombreFile = keyAntiguo.split("/").pop();
  const nuevaKey = `papelera/${registroTipo}/${registroId}/${stamp}-${nombreFile}`;

  // Copiar a papelera
  await s3.send(
    new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET,
      CopySource: `${process.env.S3_BUCKET}/${keyAntiguo}`,
      Key: nuevaKey,
      ACL: "private",
    })
  );

  // Borrar original
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: keyAntiguo,
    })
  );

  return nuevaKey;
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

/*────────────────── Upload de firmas ────────────────*/
export const uploadFirma = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "private",
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
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

/*────────────────── Upload de facturas de gastos ───*/
export const uploadComprobante = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "private",
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      // Usar el código generado del gasto (se espera en req.body.codigo)
      const codigoGasto = req.body.codigo || "sin-codigo";
      const safeName = file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const key = `facturas_gastos/${year}/${month}/${codigoGasto}/${timestamp}-${safeName}`;
      cb(null, key);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB máximo
  fileFilter: (req, file, cb) => {
    // Permitir PDF e imágenes
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido para comprobante de gasto"));
    }
  },
});

/*────────────────── Upload de comprobantes de pago ───*/
export const uploadComprobantePago = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "private",
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const solicitudId = req.params.id || "sin-id";
      const safeName = file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const key = `comprobantes_pagos/${year}/${month}/${solicitudId}/${timestamp}-${safeName}`;
      cb(null, key);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true),
});

/*────────────────── Upload genérico para cualquier archivo ───*/
export const uploadGeneric = makeUploader({
  folder: "archivos", // prefijo en S3: archivos/<año>/<mes>/...
  maxSizeMb: 10, // 10 MB máximo (ajusta si quieres otro límite)
  allowPdf: true,
});

/*────────────────── Upload de abonos CxC ─────────────*/
export const uploadComprobanteAbono = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "private",
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const ahora = new Date();
      const year = ahora.getFullYear();
      const month = String(ahora.getMonth() + 1).padStart(2, "0");
      // Código único del abono, debe venir en req.body.codigo
      const codigoAbono = req.body.codigo || "sin-codigo";
      const safeName = file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const key = `abonos_cxc/${year}/${month}/${codigoAbono}/${timestamp}-${safeName}`;
      cb(null, key);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB máximo
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido para comprobante de abono"));
    }
  },
});
