// utils/s3.js  – versión v3 limpia
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
dotenv.config();

/* 1) Cliente S3 */
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/* 2) URL pre-firmada de lectura */
export async function generarUrlPrefirmadaLectura(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/* ---- Helper genérico ---- */
const makeUploader = ({ folder, maxSizeMb, allowPdf = false }) =>
  multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET,
      acl: "private",
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) =>
        cb(null, `${folder}/${Date.now()}-${file.originalname}`),
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const okImg = file.mimetype.startsWith("image/");
      const okPdf = allowPdf && file.mimetype === "application/pdf";
      return okImg || okPdf
        ? cb(null, true)
        : cb(new Error("Solo imágenes o PDF"));
    },
  });

/* 3) Exportaciones concretas */
export const uploadFirma = makeUploader({ folder: "firmas", maxSizeMb: 5 });
export const uploadComprobante = makeUploader({
  folder: "comprobantes",
  maxSizeMb: 8,
  allowPdf: true,
});
