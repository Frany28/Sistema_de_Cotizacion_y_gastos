// utils/s3.js  – versión AWS SDK v3 + multer-s3
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
dotenv.config();


export const s3 = new S3Client({
  region: process.env.AWS_REGION, // e.g. "us-east-1"
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


export async function generarUrlPrefirmadaLectura(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}


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
    limits: { fileSize: maxSizeMb * 1024 * 1024 }, // MB → bytes
    fileFilter: (req, file, cb) => {
      const okImg = file.mimetype.startsWith("image/");
      const okPdf = allowPdf && file.mimetype === "application/pdf";
      return okImg || okPdf
        ? cb(null, true)
        : cb(new Error("Solo se permiten imágenes o PDF"));
    },
    preservePath: true,
  });


export const uploadFirma = makeUploader({
  folder: "firmas",
  maxSizeMb: 5, // solo imágenes
});

export const uploadComprobante = makeUploader({
  folder: "comprobantes",
  maxSizeMb: 8, // imágenes o PDF
  allowPdf: true,
});
