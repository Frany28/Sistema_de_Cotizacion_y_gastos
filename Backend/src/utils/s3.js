// utils/s3.js

import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
import db from "../config/database.js"; // para obtener el código del gasto

dotenv.config();

/*──────────────────── Cliente S3 ────────────────────*/
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const slugify = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const uploadComprobanteMemoria = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const esPdf = file.mimetype === "application/pdf";
    const esImagen = file.mimetype.startsWith("image/");
    if (esPdf || esImagen) return cb(null, true);
    cb(new Error("Tipo de archivo no permitido para comprobante de gasto"));
  },
}).single("documento");

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
  // Verificar si el archivo existe en S3 antes de moverlo
  try {
    const copySource = encodeURI(
      // ← ✅ codifica ñ, espacios, paréntesis…
      `${process.env.S3_BUCKET}/${claveAntigua}`
    );

    await s3.send(
      new CopyObjectCommand({
        Bucket: process.env.S3_BUCKET,
        CopySource: copySource, // ← usa la versión codificada
        Key: claveNueva,
        ACL: "private",
      })
    );
  } catch (error) {
    if (error.name === "NotFound" || error.Code === "NoSuchKey") {
      console.warn(`⚠ Archivo no encontrado en S3: ${claveAntigua}`);
      return null; // si no existe, no continuamos con la copia
    }
    throw error; // otros errores: los relanzamos
  }

  const ahora = new Date();
  const timestampStr = ahora.toISOString().replace(/[:.]/g, "-");
  const nombreArchivo = claveAntigua.split("/").pop();
  const claveNueva = `papelera/${registroTipo}/${registroId}/${timestampStr}-${nombreArchivo}`;

  // Copiar a la nueva ubicación (papelera)
  await s3.send(
    new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET,
      CopySource: `${process.env.S3_BUCKET}/${claveAntigua}`,
      Key: claveNueva,
      ACL: "private",
    })
  );

  // Eliminar el original
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

      /* 1) Intentamos tomar el nombre del body (crearUsuario) */
      if (req.body.nombre) {
        const slug = slugify(req.body.nombre);
        const clave = `firmas/${slug}/firma.${extension}`;
        return cb(null, clave);
      }

      /* 2) Si venimos de actualizarUsuario, usamos el id para buscar el nombre */
      if (req.params.id) {
        db.query("SELECT nombre FROM usuarios WHERE id = ?", [req.params.id])
          .then(([rows]) => {
            const base = rows[0]?.nombre
              ? slugify(rows[0].nombre)
              : `usuario-${req.params.id}`;
            const clave = `firmas/${base}/firma.${extension}`;
            cb(null, clave);
          })
          .catch((err) => cb(err));
        return; // salimos: el callback se hará en la promesa
      }

      /* 3) Fallback: timestamp anónimo (no debería ocurrir) */
      const clave = `firmas/usuario-desconocido/firma.${extension}`;
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
      const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];
      const ahora = new Date();
      const anio = ahora.getFullYear();
      const mesPalabra = meses[ahora.getMonth()];
      const idGasto = req.params.id;
      // Obtener el código único del gasto desde la BD
      db.query("SELECT codigo FROM gastos WHERE id = ?", [idGasto])
        .then(([rows]) => {
          const codigoGasto = rows[0]?.codigo ?? "sin-codigo";
          const nombreSeguro = file.originalname.replace(/\s+/g, "_");
          const timestamp = Date.now();
          const clave = `facturas_gastos/${anio}/${mesPalabra}/${codigoGasto}/${timestamp}-${nombreSeguro}`;
          cb(null, clave);
        })
        .catch((err) => cb(err));
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
      const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];

      const ahora = new Date();
      const anio = ahora.getFullYear();
      const mesPalabra = meses[ahora.getMonth()];
      const solicitudId = req.params.id;

      db.query("SELECT codigo FROM solicitudes_pago WHERE id = ?", [
        solicitudId,
      ])
        .then(([rows]) => {
          const codigoSolicitud =
            rows[0]?.codigo?.trim().replace(/\s+/g, "_") || `SP-${solicitudId}`;
          const nombreSeguro = file.originalname.replace(/\s+/g, "_");
          const timestamp = Date.now();
          const clave = `comprobantes_pagos/${anio}/${mesPalabra}/${codigoSolicitud}/${timestamp}-${nombreSeguro}`;
          cb(null, clave);
        })
        .catch((err) => cb(err));
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
      const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];
      const ahora = new Date();
      const anio = ahora.getFullYear();
      const mesPalabra = meses[ahora.getMonth()];

      const cuentaId = req.params.cuenta_id;
      // Obtener el código de la cuenta por cobrar desde la BD
      db.query("SELECT codigo FROM cuentas_por_cobrar WHERE id = ?", [cuentaId])
        .then(([rows]) => {
          const codigoCXC = rows[0]?.codigo ?? `CXC-${cuentaId}`;
          const nombreSeguro = file.originalname.replace(/\s+/g, "_");
          const timestamp = Date.now();
          const clave = `abonos_cxc/${anio}/${mesPalabra}/${codigoCXC}/${timestamp}-${nombreSeguro}`;
          cb(null, clave);
        })
        .catch((err) => cb(err));
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
