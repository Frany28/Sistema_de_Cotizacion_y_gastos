// routes/gastos.routes.js
import express from "express";
import {
  getGastos,
  getGastoById,
  updateGasto,
  deleteGasto,
  getProveedores,
  actualizarEstadoGasto,
  getTiposGasto,
} from "../controllers/gastos.controller.js";

// Importamos el middleware de multer-s3:
import { uploadComprobante } from "../utils/s3.js";

import { autenticarUsuario } from "../Middleware/autenticarUsuario.js";
import {
  verificarPermiso,
  scopeEdicionGasto,
} from "../Middleware/verificarPermiso.js";
import { validarGasto } from "../Middleware/validarGasto.js";

const router = express.Router();

// Rutas Públicas
router.get("/proveedores", getProveedores);
router.get("/tipos", getTiposGasto);

// Rutas Protegidas
router.get("/", autenticarUsuario, verificarPermiso("ver_gastos"), getGastos);

router.get(
  "/:id",
  autenticarUsuario,
  verificarPermiso("ver_gastos"),
  getGastoById
);

// ───────────────────────────────────────────────────────────────
//  RUTA NUEVA: Subir factura/comprobante a S3 y guardar la “key” en la columna url_factura
//  Endpoint: POST /api/gastos/:id/comprobante
// ───────────────────────────────────────────────────────────────
router.post(
  "/:id/comprobante",
  autenticarUsuario,
  verificarPermiso("editar_gasto"),
  uploadComprobante.single("comprobante"),
  async (req, res) => {
    try {
      const idGasto = req.params.id;

      // 1) Verificar que el gasto exista
      const [rows] = await db.execute("SELECT id FROM gastos WHERE id = ?", [
        idGasto,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ error: "Gasto no encontrado" });
      }

      // 2) Verificar que multer-s3 haya subido el archivo
      if (!req.file) {
        return res.status(400).json({ error: "No se envió ningún archivo" });
      }

      // 3) Obtenemos la “key” interna en S3
      //    Ejemplo: “comprobantes/1689481234567-factura.png”
      const keyFactura = req.file.key;

      // 4) Guardar esa key en la BD, en la columna url_factura
      await db.execute("UPDATE gastos SET url_factura = ? WHERE id = ?", [
        keyFactura,
        idGasto,
      ]);

      return res.json({
        mensaje: "Factura subido correctamente",
        urlFacturaKey: keyFactura,
      });
    } catch (err) {
      console.error("Error subiendo factura a S3:", err);
      return res.status(500).json({ error: "Error subiendo factura" });
    }
  }
);

// Resto de rutas: PUT /:id, PUT /:id/estado, DELETE /:id
router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editar_gasto"),
  scopeEdicionGasto,
  validarGasto,
  updateGasto
);

router.put(
  "/:id/estado",
  autenticarUsuario,
  verificarPermiso("aprobar_gasto"),
  actualizarEstadoGasto
);

router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminar_gasto"),
  deleteGasto
);

export default router;
