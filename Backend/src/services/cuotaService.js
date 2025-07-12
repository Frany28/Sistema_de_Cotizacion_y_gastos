// services/cuotaService.js
import db from "../database/conexionDb.js";

const BYTES_EN_MB = 1024 * 1024;

/** Devuelve true si el usuario aún tiene espacio para subir 'pesoBytes' */
export const tieneEspacio = async (usuarioId, pesoBytes) => {
  // 1) Trae cuota y uso actual
  const [usuario] = await db.query(
    `SELECT cuotaMb, usoStorageBytes
       FROM usuarios
      WHERE id = ?`,
    [usuarioId]
  );

  if (!usuario) return false; // usuario inexistente
  if (usuario.cuotaMb === null) return true; // admin → ilimitado

  const limiteBytes = usuario.cuotaMb * BYTES_EN_MB;
  return usuario.usoStorageBytes + pesoBytes <= limiteBytes;
};
