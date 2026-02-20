// controllers/cotizaciones.controller.js
import db from "../config/database.js";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import cacheMemoria from "../utils/cacheMemoria.js";
import { generarHTMLCotizacion } from "../../templates/generarHTMLCotizacion.js";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const archivoActual = fileURLToPath(import.meta.url);
const carpetaActual = path.dirname(archivoActual);

let logo = null;
try {
  const rutaLogo = path.join(
    carpetaActual,
    "..",
    "..",
    "styles",
    "Logo Operaciones Logisticas Falcon.jpg",
  );
  const bufferLogo = fs.readFileSync(rutaLogo);
  logo = `data:image/jpeg;base64,${bufferLogo.toString("base64")}`;
} catch (err) {
  console.error("No se pudo cargar el logo en Cotización:", err);
}

// Obtener todas las cotizaciones con detalle


export const getCotizaciones = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const q = (req.query.q || "").trim();
    const offset = (page - 1) * limit;

    const esAdmin = Number(req.user?.rolId ?? req.user?.rol_id) === 1;
    const sucursalIdUsuario = Number(
      req.user?.sucursalId ?? req.user?.sucursal_id,
    );

    const claveCache = esAdmin
      ? `cotizaciones_${page}_${limit}_${q || "all"}_admin`
      : `cotizaciones_${page}_${limit}_${q || "all"}_sucursal_${sucursalIdUsuario}`;

    const enCache = cacheMemoria.get(claveCache);
    if (enCache) return res.json(enCache);

    const where = [];
    const params = [];

    if (!esAdmin) {
      where.push("c.sucursal_id = ?");
      params.push(sucursalIdUsuario);
    }

    if (q) {
      where.push(`(
        c.codigo_referencia LIKE ? OR
        cli.nombre LIKE ?
      )`);
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ total }]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM cotizaciones c
      LEFT JOIN clientes cli ON cli.id = c.cliente_id
      ${whereSql}
      `,
      params,
    );

    const [cotizaciones] = await db.query(
      `
      SELECT
        c.*,
        cli.nombre AS cliente_nombre,
        s.nombre AS sucursal_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cli ON cli.id = c.cliente_id
      LEFT JOIN sucursales s ON s.id = c.sucursal_id
      ${whereSql}
      ORDER BY c.fecha DESC, c.id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      params,
    );

    const respuesta = { data: cotizaciones, total, page, limit };
    cacheMemoria.set(claveCache, respuesta);
    return res.json(respuesta);
  } catch (error) {
    console.error("Error en getCotizaciones:", error);
    return res.status(500).json({ message: "Error al obtener cotizaciones" });
  }
};

// controllers/cotizaciones.controller.js
export const getCotizacionById = async (req, res) => {
  const { id } = req.params;
  const claveCache = `cotizacion_${id}`;
  const enCache = cacheMemoria.get(claveCache);
  if (enCache) return res.json(enCache);

  try {
    // 1) Cabecera: agregamos los campos que faltaban
    const [[cot]] = await db.query(
      `SELECT
         c.id,
         c.fecha,
         c.total,
         c.estado,
         c.subtotal,
         c.impuesto,
         c.cliente_id,
         c.sucursal_id,
         s.nombre    AS sucursal,
         c.confirmacion_cliente,
         c.observaciones,
         c.operacion,
         c.mercancia,
         c.bl,
         c.contenedor,
         c.puerto,
         c.motivo_rechazo,
         c.codigo_referencia AS codigo, 
         cli.nombre  AS cliente_nombre,
         cli.email,
         u.nombre    AS declarante
       FROM cotizaciones c
       JOIN clientes cli ON c.cliente_id = cli.id
       LEFT JOIN sucursales s ON c.sucursal_id = s.id
      LEFT JOIN usuarios u   ON u.id = c.creadoPor
       WHERE c.id = ?`,
      [id],
    );
    if (!cot)
      return res.status(404).json({ message: "No existe esa cotización" });

    // 2) Detalle: ahora traemos también dc.id y dc.servicio_productos_id
    const [detalle] = await db.query(
      `SELECT
         dc.id,
         dc.servicio_productos_id,
         sp.nombre           AS servicio,
         sp.descripcion,
         dc.cantidad,
         dc.precio_unitario,
         dc.porcentaje_iva,
         dc.subtotal,
         dc.impuesto,
         dc.total
       FROM detalle_cotizacion dc
       JOIN servicios_productos sp ON sp.id = dc.servicio_productos_id
       WHERE dc.cotizacion_id = ?`,
      [id],
    );

    // 3) Ajustes de tipos si los necesitas…
    cot.subtotal = Number(cot.subtotal);
    cot.impuesto = Number(cot.impuesto);
    cot.total = Number(cot.total);
    cot.detalle = detalle;

    cacheMemoria.set(claveCache, cot);
    return res.json(cot);
  } catch (error) {
    console.error("Error al obtener cotización:", error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// Actualizar estado de cotización
export const actualizarEstadoCotizacion = async (req, res) => {
  const { id } = req.params;
  const { estado, motivo_rechazo } = req.body;

  const [estadoRow] = await db.query(
    "SELECT estado FROM cotizaciones WHERE id = ?",
    [id],
  );
  if (!estadoRow.length) {
    return res.status(404).json({ message: "Cotización no encontrada" });
  }
  if (estadoRow[0].estado === "aprobada") {
    return res.status(403).json({
      message: "No se puede cambiar el estado de una cotización aprobada",
    });
  }

  if (!["pendiente", "aprobada", "rechazada"].includes(estado)) {
    return res.status(400).json({ message: "Estado no válido" });
  }

  if (estado === "rechazada" && (!motivo_rechazo || !motivo_rechazo.trim())) {
    return res
      .status(400)
      .json({ message: "Debes indicar el motivo del rechazo." });
  }

  try {
    const [result] = await db.query(
      `UPDATE cotizaciones
          SET estado = ?,
              motivo_rechazo = ?
        WHERE id = ?`,
      [estado, estado === "rechazada" ? motivo_rechazo.trim() : null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    if (estado === "aprobada") {
      const [cotizacionData] = await db.query(
        `SELECT cliente_id, total FROM cotizaciones WHERE id = ?`,
        [id],
      );

      if (cotizacionData.length > 0) {
        const cot = cotizacionData[0];

        // Primero insertar la cuenta por cobrar
        const [insertResult] = await db.query(
          `INSERT INTO cuentas_por_cobrar 
          (codigo, cliente_id, cotizacion_id, monto, descripcion, estado, fecha_emision, fecha_vencimiento)
              VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY))`,
          [
            "",
            cot.cliente_id,
            id,
            cot.total,
            `Cuenta generada por cotización #${id}`,
            "pendiente",
          ],
        );

        const nuevoId = insertResult.insertId;
        const codigoGenerado = `CXC-${nuevoId.toString().padStart(5, "0")}`;

        await db.query(
          `UPDATE cuentas_por_cobrar SET codigo = ? WHERE id = ?`,
          [codigoGenerado, nuevoId],
        );

        cacheMemoria.del(`cotizacion_${id}`);
        for (const k of cacheMemoria.keys()) {
          if (k.startsWith("cotizaciones_")) cacheMemoria.del(k);
        }
      }
    }

    res.json({ message: "Estado de cotización actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar el estado de la cotización" });
  }
};

export const buscarCotizaciones = async (req, res) => {
  const q = (req.query.q || "").trim();
  const clave = `buscCot_${q}`;
  const hit = cacheMemoria.get(clave);
  if (hit) return res.json(hit);

  const [rows] = await db.query(
    `
      SELECT c.id,
             c.codigo_referencia   AS codigo,
             cli.nombre            AS cliente,
             c.total
      FROM cotizaciones c
      JOIN clientes cli ON cli.id = c.cliente_id
      WHERE c.codigo_referencia LIKE ? OR cli.nombre LIKE ?
      ORDER BY c.id DESC LIMIT 20`,
    [`%${q}%`, `%${q}%`],
  );

  cacheMemoria.set(clave, rows, 120);
  res.json(rows);
};

// En cotizaciones.controller.js

export const editarCotizacion = async (req, res) => {
  const { id } = req.params;

  const {
    cliente_id,
    sucursal_id,
    operacion = "",
    mercancia = "",
    bl = "",
    contenedor = "",
    puerto = "",
    confirmacion_cliente = false,
    observaciones = "",
    detalle = [],
  } = req.body;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Validar estado actual
    const [rowsEstado] = await conn.query(
      `SELECT estado FROM cotizaciones WHERE id = ?`,
      [id],
    );
    if (rowsEstado.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Cotización no encontrada." });
    }
    const estadoActual = rowsEstado[0].estado;
    if (!["pendiente", "rechazada"].includes(estadoActual)) {
      await conn.rollback();
      return res.status(403).json({
        message:
          'Sólo se pueden editar cotizaciones en estado "pendiente" o "rechazada".',
      });
    }

    // 2) Actualizar cabecera (IMPORTANTE: usar fechaActualizacion, no updated_at)
    const confirmacionClienteVal = confirmacion_cliente ? 1 : 0;
    await conn.query(
      `UPDATE cotizaciones
          SET cliente_id           = ?,
              sucursal_id          = ?,
              operacion            = ?,
              mercancia            = ?,
              bl                   = ?,
              contenedor           = ?,
              puerto               = ?,
              confirmacion_cliente = ?,
              observaciones        = ?,
              estado               = 'pendiente',
              fechaActualizacion   = NOW()
        WHERE id = ?`,
      [
        cliente_id,
        sucursal_id,
        operacion,
        mercancia,
        bl,
        contenedor,
        puerto,
        confirmacionClienteVal,
        observaciones,
        id,
      ],
    );

    // 3) Leer detalle actual (viejo)
    const [detalleOldRows] = await conn.query(
      `SELECT id, servicio_productos_id, cantidad, precio_unitario, porcentaje_iva
         FROM detalle_cotizacion
        WHERE cotizacion_id = ?`,
      [id],
    );
    const viejoPorId = new Map(detalleOldRows.map((r) => [r.id, r]));

    // 4) Determinar operaciones en detalle
    const idsAEliminar = [];
    const lineasAActualizar = [];
    const lineasAInsertar = [];

    // a) Eliminar: ids viejos que no estén en el arreglo nuevo
    detalleOldRows.forEach(({ id: oldId }) => {
      if (!detalle.some((n) => n.id === oldId)) {
        idsAEliminar.push(oldId);
      }
    });

    // b) Clasificar inserciones/actualizaciones
    detalle.forEach((item) => {
      if (item.id) {
        const viejo = viejoPorId.get(item.id);
        if (
          viejo.servicio_productos_id !== item.servicio_productos_id ||
          viejo.cantidad !== Number(item.cantidad) ||
          viejo.precio_unitario !== Number(item.precio_unitario) ||
          viejo.porcentaje_iva !== Number(item.porcentaje_iva)
        ) {
          lineasAActualizar.push(item);
        }
      } else {
        lineasAInsertar.push(item);
      }
    });

    // 5) Ejecutar eliminaciones
    if (idsAEliminar.length) {
      await conn.query(`DELETE FROM detalle_cotizacion WHERE id IN (?)`, [
        idsAEliminar,
      ]);
    }

    // 6) Ejecutar actualizaciones (recalcula importes por línea)
    for (const {
      id: lineaId,
      servicio_productos_id,
      cantidad,
      precio_unitario,
      porcentaje_iva,
    } of lineasAActualizar) {
      const cant = Number(cantidad);
      const precio = Number(precio_unitario);
      const iva = Number(
        typeof porcentaje_iva === "number" ? porcentaje_iva : 16,
      );
      const sub = cant * precio;
      const imp = sub * (iva / 100);
      await conn.query(
        `UPDATE detalle_cotizacion
            SET servicio_productos_id = ?,
                cantidad              = ?,
                precio_unitario       = ?,
                porcentaje_iva        = ?,
                subtotal              = ?,
                impuesto              = ?,
                total                 = ?
          WHERE id = ?`,
        [
          servicio_productos_id,
          cant,
          precio,
          iva,
          sub,
          imp,
          sub + imp,
          lineaId,
        ],
      );
    }

    // 7) Ejecutar inserciones (recalcula importes por línea)
    for (const {
      servicio_productos_id,
      cantidad,
      precio_unitario,
      porcentaje_iva = 16,
    } of lineasAInsertar) {
      const cant = Number(cantidad);
      const precio = Number(precio_unitario);
      const iva = Number(porcentaje_iva);
      const sub = cant * precio;
      const imp = sub * (iva / 100);
      await conn.query(
        `INSERT INTO detalle_cotizacion
           (cotizacion_id, servicio_productos_id, cantidad, precio_unitario, porcentaje_iva, subtotal, impuesto, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, servicio_productos_id, cant, precio, iva, sub, imp, sub + imp],
      );
    }

    // 8) Recalcular totales desde BD (fiable y consistente)
    const [[totales]] = await conn.query(
      `SELECT 
         IFNULL(SUM(subtotal), 0) AS subtotal,
         IFNULL(SUM(impuesto), 0) AS impuesto
       FROM detalle_cotizacion
      WHERE cotizacion_id = ?`,
      [id],
    );

    const subtotalCalc = Number(totales.subtotal || 0);
    const impuestoCalc = Number(totales.impuesto || 0);
    const totalCalc = subtotalCalc + impuestoCalc;

    await conn.query(
      `UPDATE cotizaciones
          SET subtotal = ?, 
              impuesto = ?, 
              total    = ?,
              fechaActualizacion = NOW()
        WHERE id = ?`,
      [subtotalCalc, impuestoCalc, totalCalc, id],
    );

    await conn.commit();

    // 9) Limpiar caches relacionadas
    cacheMemoria.del(`cotizacion_${id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("cotizaciones_")) cacheMemoria.del(k);
    }

    return res.json({
      message: "Cotización actualizada y reabierta como 'pendiente'.",
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error editando cotización:", error);
    return res
      .status(500)
      .json({ message: "Error al editar la cotización.", error });
  } finally {
    conn.release();
  }
};

export const deleteCotizacion = async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Verificar si existe y cuál es su estado
    const [rows] = await db.query(
      "SELECT estado FROM cotizaciones WHERE id = ?",
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }
    if (rows[0].estado === "aprobada") {
      return res
        .status(403)
        .json({ message: "No puede eliminar una cotización aprobada" });
    }

    // 2) Eliminar detalles primero
    await db.query("DELETE FROM detalle_cotizacion WHERE cotizacion_id = ?", [
      id,
    ]);

    // 3) Luego eliminar la cotización
    const [result] = await db.query("DELETE FROM cotizaciones WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    cacheMemoria.del(`cotizacion_${id}`);
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("cotizaciones_")) cacheMemoria.del(k);
    }

    return res.json({ message: "Cotización eliminada exitosamente" });
  } catch (error) {
    console.error("Error al eliminar cotización:", error);
    return res
      .status(500)
      .json({ message: "Hubo un error al eliminar la cotización" });
  }
};

// Generar PDF de cotización

export const generarPDFCotizacion = async (req, res) => {
  const { id } = req.params;

  try {
    const [cotizacionData] = await db.query(
      `SELECT 
        c.id,
        c.codigo_referencia AS codigo,
        c.fecha,
        c.total,
        c.estado,
        c.subtotal,
        c.impuesto,
        c.observaciones,
        c.operacion,
        c.mercancia,
        c.bl,
        c.contenedor,
        c.puerto,
        s.nombre AS sucursal,
        cli.nombre AS cliente_nombre,
        cli.email,
        u.nombre AS declarante
      FROM cotizaciones c
      JOIN clientes cli ON cli.id = c.cliente_id
      LEFT JOIN sucursales s ON c.sucursal_id = s.id
      LEFT JOIN usuarios u ON u.id = c.creadoPor
      WHERE c.id = ?`,
      [id],
    );

    if (cotizacionData.length === 0) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    const cotizacion = cotizacionData[0];

    const [detalleCotizacion] = await db.query(
      `SELECT 
         sp.nombre AS servicio,
         sp.tipo,
         dc.cantidad,
         dc.precio_unitario,
         dc.porcentaje_iva,
         dc.subtotal,
         dc.impuesto,
         dc.total
       FROM detalle_cotizacion dc
       JOIN servicios_productos sp ON sp.id = dc.servicio_productos_id
       WHERE dc.cotizacion_id = ?
       ORDER BY sp.nombre`,
      [id],
    );

    const datosCotizacion = {
      codigo: cotizacion.codigo,
      fecha: cotizacion.fecha,
      cliente: cotizacion.cliente_nombre,
      sucursal: cotizacion.sucursal || "N/A",
      estado: cotizacion.estado,
      observaciones: cotizacion.observaciones,
      operacion: cotizacion.operacion || "N/A",
      mercancia: cotizacion.mercancia || "N/A",
      bl: cotizacion.bl || "N/A",
      contenedor: cotizacion.contenedor || "N/A",
      puerto: cotizacion.puerto || "N/A",
      declarante: cotizacion.declarante || "N/A",
      subtotal: cotizacion.subtotal,
      impuesto: cotizacion.impuesto,
      total: cotizacion.total,
      detalle: detalleCotizacion,
      logo,
    };

    const html = generarHTMLCotizacion(datosCotizacion, "final");

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=cotizacion_${cotizacion.codigo}.pdf`,
      })
      .send(pdfBuffer);
  } catch (err) {
    console.error("Error generando PDF de cotización:", err);
    res.status(500).json({ message: "Error al generar PDF de cotización" });
  }
};
