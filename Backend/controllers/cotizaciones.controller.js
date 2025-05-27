// controllers/cotizaciones.controller.js
import db from "../config/database.js";
import path from "path";
import chromium from "chrome-aws-lambda";
import { generarHTMLCotizacion } from "../templates/generarHTMLCotizacion.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtener todas las cotizaciones con detalle

export const getCotizaciones = async (req, res) => {
  // 1) Parámetros de paginación
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 10
    : Number(req.query.limit);
  const offset = (page - 1) * limit;

  // 2) Parámetro de búsqueda (opcional)
  const q = (req.query.search || "").trim();

  console.log("Paginación cotizaciones:", { page, limit, offset, search: q });

  try {
    // 3) Total de registros (filtrado si hay búsqueda)
    let total;
    if (q) {
      const [[{ total: count }]] = await db.query(
        `SELECT COUNT(*) AS total
           FROM cotizaciones c
           JOIN clientes cli ON c.cliente_id = cli.id
          WHERE c.codigo_referencia LIKE ? OR cli.nombre LIKE ?`,
        [`%${q}%`, `%${q}%`]
      );
      total = count;
    } else {
      const [[{ total: count }]] = await db.query(
        `SELECT COUNT(*) AS total FROM cotizaciones`
      );
      total = count;
    }

    // 4) Listado paginado y (opcional) filtrado
    let cotizaciones;
    if (q) {
      [cotizaciones] = await db.query(
        `
          SELECT 
            c.id,
            c.fecha,
            c.total,
            c.estado,
            c.motivo_rechazo,
            c.codigo_referencia AS codigo,
            c.subtotal,
            c.impuesto,
            c.cliente_id,
            c.sucursal_id,
            c.confirmacion_cliente,
            c.observaciones,
            s.nombre AS sucursal,
            cli.nombre AS cliente_nombre
          FROM cotizaciones c
          JOIN clientes cli ON c.cliente_id = cli.id
          LEFT JOIN sucursales s ON c.sucursal_id = s.id
         WHERE c.codigo_referencia LIKE ? OR cli.nombre LIKE ?
         ORDER BY c.fecha DESC
         LIMIT ${limit} OFFSET ${offset}
        `,
        [`%${q}%`, `%${q}%`]
      );
    } else {
      [cotizaciones] = await db.query(
        `
          SELECT 
            c.id,
            c.fecha,
            c.total,
            c.estado,
            c.motivo_rechazo,
            c.codigo_referencia AS codigo,
            c.subtotal,
            c.impuesto,
            c.cliente_id,
            c.sucursal_id,
            c.confirmacion_cliente,
            c.observaciones,
            s.nombre AS sucursal,
            cli.nombre AS cliente_nombre
          FROM cotizaciones c
          JOIN clientes cli ON c.cliente_id = cli.id
          LEFT JOIN sucursales s ON c.sucursal_id = s.id
         ORDER BY c.fecha DESC
         LIMIT ${limit} OFFSET ${offset}
        `
      );
    }

    // 5) Enviar respuesta
    return res.json({ cotizaciones, total, page, limit });
  } catch (error) {
    console.error("Error al obtener cotizaciones:", error);
    return res.status(500).json({ message: "Error al obtener cotizaciones" });
  }
};

// Obtener una cotización específica
export const getCotizacionById = async (req, res) => {
  const { id } = req.params;

  try {
    const [cotizacion] = await db.query(
      `SELECT 
    c.id, 
    c.fecha, 
    c.total, 
    c.estado, 
    c.subtotal, 
    c.impuesto,
    c.cliente_id, 
    c.sucursal_id,
    s.nombre AS sucursal, 
    c.confirmacion_cliente,
    c.observaciones,
    cli.nombre AS cliente_nombre, 
    cli.email,
    u.nombre AS declarante
  FROM cotizaciones c
  JOIN clientes cli ON c.cliente_id = cli.id
  LEFT JOIN sucursales s ON c.sucursal_id = s.id 
  LEFT JOIN usuarios u ON u.id = c.usuario_id
  WHERE c.id = ?


    `,
      [id]
    );

    if (cotizacion.length === 0)
      return res.status(404).json({ message: "Cotización no encontrada" });

    cotizacion[0].subtotal = Number(cotizacion[0].subtotal) || 0;
    cotizacion[0].impuesto = Number(cotizacion[0].impuesto) || 0;
    cotizacion[0].total = Number(cotizacion[0].total) || 0;

    const [detalle] = await db.query(
      `SELECT 
        sp.nombre AS servicio, 
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
      [id]
    );

    cotizacion[0].detalle = detalle;
    res.json(cotizacion[0]);
  } catch (error) {
    console.error("Error al obtener cotización:", error);
    res.status(500).json({ message: "Error al obtener la cotización" });
  }
};

// Actualizar estado de cotización
export const actualizarEstadoCotizacion = async (req, res) => {
  const { id } = req.params;
  const { estado, motivo_rechazo } = req.body;

  const [estadoRow] = await db.query(
    "SELECT estado FROM cotizaciones WHERE id = ?",
    [id]
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
      [estado, estado === "rechazada" ? motivo_rechazo.trim() : null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    if (estado === "aprobada") {
      const [cotizacionData] = await db.query(
        `SELECT cliente_id, total FROM cotizaciones WHERE id = ?`,
        [id]
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
          ]
        );

        const nuevoId = insertResult.insertId;
        const codigoGenerado = `CXC-${nuevoId.toString().padStart(5, "0")}`;

        await db.query(
          `UPDATE cuentas_por_cobrar SET codigo = ? WHERE id = ?`,
          [codigoGenerado, nuevoId]
        );
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
    [`%${q}%`, `%${q}%`]
  );
  res.json(rows);
};

// En cotizaciones.controller.js
export const editarCotizacion = async (req, res) => {
  const { id } = req.params;
  const {
    cliente_id,
    sucursal_id,
    confirmacion_cliente = false,
    observaciones = "",
  } = req.body;

  try {
    await db.query(
      `UPDATE cotizaciones SET 
        cliente_id = ?, 
        sucursal_id = ?, 
        confirmacion_cliente = ?, 
        observaciones = ?, 
        updated_at = NOW()
      WHERE id = ?`,
      [cliente_id, sucursal_id, confirmacion_cliente, observaciones, id]
    );

    res.json({
      message: "Cotización actualizada con éxito",
      cotizacion_id: id,
    });
  } catch (error) {
    console.error("Error al editar cotización:", error);
    res.status(500).json({ message: "Error al editar la cotización" });
  }
};

export const deleteCotizacion = async (req, res) => {
  const { id } = req.params;

  try {
    // 1) Verificar si existe y cuál es su estado
    const [rows] = await db.query(
      "SELECT estado FROM cotizaciones WHERE id = ?",
      [id]
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
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.id = ?`,
      [id]
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
      [id]
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
    };

    const html = generarHTMLCotizacion(datosCotizacion, "final");

    const browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=cotizacion_${cotizacion.codigo}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generando PDF de cotización:", error);
    res.status(500).json({ message: "Error al generar PDF de cotización" });
  }
};
