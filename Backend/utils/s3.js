// utils/s3.js

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1) Creamos una instancia de S3Client (SDK v3)
// -----------------------------------------------------------
// Explicación de cada parámetro:
// - region: la región de tu bucket (p. ej. "us-east-1" o "sa-east-1").
// - credentials: opcional si usas variables de entorno AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
//   Si las tienes definidas en .env, el SDK las toma automáticamente sin necesidad de pasarlas aquí.
// -----------------------------------------------------------
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  // Si no usas variables de entorno, podrías descomentar estas líneas:
  // credentials: {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  // },
});

// Nombre de bucket (debe coincidir con tu configuración en AWS S3)
const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "mi-bucket";

// 2) Función para subir buffers a S3 con Upload (multipart sube más rápido si el archivo es grande)
// -----------------------------------------------------------
// Parámetros:
// - buffer: Buffer del archivo (ej: req.file.buffer).
// - nombreArchivo: cadena con la "key" que queremos asignar en S3, por ejemplo `usuarios/${Date.now()}-firma.jpg`.
// - mimetype: tipo MIME del archivo (ej: "image/png").
// -----------------------------------------------------------
export const subirArchivoS3 = async (buffer, nombreArchivo, mimetype) => {
  // Construimos el parámetro para Upload
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: nombreArchivo,
    Body: buffer,
    ContentType: mimetype,
    ACL: "public-read", // si quieres que sea público. Si no, quitar esta línea.
  };

  // La clase Upload del SDK v3 maneja automáticamente multipart si el archivo supera cierto tamaño.
  const parallelUploads3 = new Upload({
    client: s3Client, // <--- Este S3Client SÍ implementa `.send()`.
    params: uploadParams,
    queueSize: 4, // cuántas partes simultáneas
    partSize: 5 * 1024 * 1024, // tamaño por parte = 5MiB
    leavePartsOnError: false, // elimina partes si algo falla
  });

  try {
    await parallelUploads3.done(); // se resuelve cuando termina la subida.
    return nombreArchivo; // retornamos la "key" dentro del bucket
  } catch (err) {
    console.error("Error subiendo a S3:", err);
    throw err;
  }
};

// 3) Función para generar URL prefirmada de lectura (lectura privada).
// -----------------------------------------------------------
// Se usa cuando quieres mostrar la firma en el front-end mediante un enlace temporal.
// Parámetro:
// - key: la ruta/clave dentro del bucket (ej: "usuarios/167889-firma.png").
// -----------------------------------------------------------
export const generarUrlPrefirmadaLectura = async (key) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  // URL expira en 15 minutos (valor en segundos)
  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  return url;
};
