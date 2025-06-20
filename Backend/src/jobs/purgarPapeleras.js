// jobs/purgarPapeleras.js
import cron from "node-cron";
import db from "../config/database.js";
import { s3 } from "../utils/s3.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// Ejecutar todos los días a la 1:00 AM
cron.schedule("0 1 * * *", async () => {
  console.log("[CRON] Iniciando purga automática de papelera...");

  try {
    // 1. Buscar archivos eliminados hace más de 30 días
    const [archivos] = await db.query(
      `SELECT id, documento FROM archivos
       WHERE estado = 'eliminado' AND eliminadoEn <= NOW() - INTERVAL 30 DAY`
    );

    for (const archivo of archivos) {
      try {
        // 2. Eliminar archivo en S3
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: archivo.documento,
          })
        );

        // 3. Eliminar archivo en base de datos
        await db.execute(`DELETE FROM archivos WHERE id = ?`, [archivo.id]);

        // 4. Registrar evento (opcional)
        await db.execute(
          `INSERT INTO eventosArchivo (archivoId, accion, usuarioId, detalles)
           VALUES (?, 'borradoDefinitivo', NULL, ?)`,
          [
            archivo.id,
            JSON.stringify({ motivo: "cronjob", s3Key: archivo.documento }),
          ]
        );

        console.log(`Archivo ${archivo.id} eliminado permanentemente.`);
      } catch (err) {
        console.error(
          `Error eliminando archivo ${archivo.id}:`,
          err.message
        );
      }
    }
  } catch (error) {
    console.error("[CRON] Error general en purga de papelera:", error.message);
  }
});
