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
  claveAntigua,
  registroTipo,
  registroId
) {
  const ahora = new Date();
  const timestampStr = ahora.toISOString().replace(/[:.]/g, "-");
  const nombreArchivo = claveAntigua.split("/").pop();
  const claveNueva = `papelera/${registroTipo}/${registroId}/${timestampStr}-${nombreArchivo}`;

  await s3.send(
    new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET,
      CopySource: `${process.env.S3_BUCKET}/${claveAntigua}`,
      Key: claveNueva,
      ACL: "private",
    })
  );

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: claveAntigua,
    })
  );

  return claveNueva;
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
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, "0");
        const nombreSeguro = file.originalname.replace(/\s+/g, "_");
        const timestamp = Date.now();
        const clave = `${folder}/${anio}/${mes}/${timestamp}-${nombreSeguro}`;
        cb(null, clave);
      },
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        if (allowPdf) return cb(null, true);
        return cb(new Error("Archivos PDF no permitidos"));
      }
      return cb(null, true);
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
      const usuario = req.body.nombre
        ? req.body.nombre.trim().replace(/\s+/g, "_")
        : `usuario_${Date.now()}`;
      const extension = file.originalname.split(".").pop();
      const nombre = `firma.${extension}`;
      const clave = `firmas/${usuario}/${nombre}`;
      cb(null, clave);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (tiposPermitidos.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Tipo de archivo no permitido para firma"));
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
      const ahora = new Date();
      const anio = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, "0");
      const codigoGasto = req.body.codigo || "sin-codigo";
      const nombreSeguro = file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const clave = `facturas_gastos/${anio}/${mes}/${codigoGasto}/${timestamp}-${nombreSeguro}`;
      cb(null, clave);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esPdf = file.mimetype === "application/pdf";
    const esImagen = file.mimetype.startsWith("image/");
    if (esPdf || esImagen) return cb(null, true);
    return cb(
      new Error("Tipo de archivo no permitido para comprobante de gasto")
    );
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
      const ahora = new Date();
      const anio = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, "0");
      const solicitudId = req.params.id || "sin-id";
      const nombreSeguro = file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const clave = `comprobantes_pagos/${anio}/${mes}/${solicitudId}/${timestamp}-${nombreSeguro}`;
      cb(null, clave);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true),
});

/*────────────────── Upload genérico para cualquier archivo ───*/
export const uploadGeneric = makeUploader({
  folder: "archivos",
  maxSizeMb: 10,
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
      const anio = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, "0");
      const codigoAbono = req.body.codigo || "sin-codigo";
      const nombreSeguro = file.originalname.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const clave = `abonos_cxc/${anio}/${mes}/${codigoAbono}/${timestamp}-${nombreSeguro}`;
      cb(null, clave);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esPdf = file.mimetype === "application/pdf";
    const esImagen = file.mimetype.startsWith("image/");
    if (esPdf || esImagen) return cb(null, true);
    return cb(
      new Error("Tipo de archivo no permitido para comprobante de abono")
    );
  },
});
