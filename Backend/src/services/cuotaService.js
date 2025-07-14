// services/cuotaService.js
import db from "../config/database.js";
import { es } from "date-fns/locale";


/**
 * Verifica si el usuario aún dispone de espacio para subir un archivo.
 * @param {number} usuarioId   – ID del usuario autenticado
 * @param {number} pesoBytes   – Tamaño del archivo que se pretende subir
 * @returns {boolean}          – true si hay espacio suficiente
 */
export const tieneEspacio = async (usuarioId, pesoBytes) => {
  // 1) Traer cuota y uso actuales -----------------------------------------
  const [[usuario]] = await db.query(
    `SELECT cuotaMb, usoStorageBytes
       FROM usuarios
      WHERE id = ?`,
    [usuarioId]
  );

  if (!usuario) throw new Error("usuarioNoEncontrado");

  // 2) Normalizar valores nulos -------------------------------------------
  const cuotaMb = usuario.cuotaMb ?? null; // null = ilimitado
  const usoActualBytes = usuario.usoStorageBytes ?? 0; // null → 0
  const nuevoUsoBytes = usoActualBytes + pesoBytes;

  // 3) Si no existe cuota (ilimitado) siempre hay espacio -----------------
  if (cuotaMb === null) return true;

  // 4) Comparar contra la cuota -------------------------------------------
  const cuotaBytes = cuotaMb * 1_048_576; // 1 MB = 1_048_576 bytes
  return nuevoUsoBytes <= cuotaBytes;
};

/**
 * Suma el peso del archivo recién subido al contador del usuario.
 * Úsala justo después de confirmar que la subida se completó con éxito.
 */
export const sumarUsoStorage = async (usuarioId, pesoBytes) => {
  await db.query(
    `UPDATE usuarios
        SET usoStorageBytes = COALESCE(usoStorageBytes,0) + ?
      WHERE id = ?`,
    [pesoBytes, usuarioId]
  );
};
