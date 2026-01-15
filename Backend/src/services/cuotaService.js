// services/cuotaService.js
import db from "../config/database.js";

/**
 * Verifica si el usuario aún dispone de espacio para subir un archivo.
 * @param {number} usuarioId   – ID del usuario autenticado
 * @param {number} pesoBytes   – Tamaño del archivo que se pretende subir
 * @returns {boolean}          – true si hay espacio suficiente
 */
export const validarCuotaDisponible = ({
  cuotaMb,
  usoStorageBytes,
  bytesNuevoArchivo,
}) => {
  // Si la cuota es null → ilimitado
  if (cuotaMb === null) {
    return true;
  }

  const cuotaBytes = cuotaMb * 1024 * 1024;
  const totalUsado = usoStorageBytes + bytesNuevoArchivo;

  return totalUsado <= cuotaBytes;
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
