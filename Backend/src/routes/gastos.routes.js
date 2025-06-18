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
  obtenerUrlComprobante,
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
  verificarPermiso("verGastos"),
  getGastoById
);

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

      const keyFactura = req.file.key;

      // 4) Guardar esa key en la BD, en la columna
      await db.execute("UPDATE gastos SET documento = ? WHERE id = ?", [
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

router.get(
  "/:id/comprobante",
  autenticarUsuario,
  verificarPermiso("verGastos"),
  obtenerUrlComprobante
);

router.put(
  "/:id",
  autenticarUsuario,
  verificarPermiso("editarGasto"),
  scopeEdicionGasto,
  uploadComprobante.single("documento"),
  validarGasto,
  updateGasto
);

router.put(
  "/:id/estado",
  autenticarUsuario,
  verificarPermiso("aprobarGasto"),
  actualizarEstadoGasto
);

router.delete(
  "/:id",
  autenticarUsuario,
  verificarPermiso("eliminarGasto"),
  deleteGasto
);

export default router;
