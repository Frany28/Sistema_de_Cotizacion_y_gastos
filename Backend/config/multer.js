// src/config/multer.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Resolver __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas absolutas para firmas y comprobantes
const uploadDirFirmas = path.resolve(__dirname, "../uploads/firmas");
const uploadDirComprobantes = path.resolve(
  __dirname,
  "../uploads/comprobantes"
);

// Crear carpetas si no existen
[uploadDirFirmas, uploadDirComprobantes].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "firma") {
      cb(null, uploadDirFirmas);
    } else if (file.fieldname === "ruta_comprobante") {
      cb(null, uploadDirComprobantes);
    } else {
      cb(null, uploadDirComprobantes);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".png", ".jpg", ".jpeg"].includes(ext)) {
      return cb(new Error("Solo se permiten archivos PDF o imágenes"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
