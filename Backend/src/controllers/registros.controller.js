import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generarHTMLCotizacion } from "../../templates/generarHTMLCotizacion.js";
import path from "path";
import { fileURLToPath } from "url";
import db from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtener datos para formulario de nuevo registro
export const getDatosRegistro = async (req, res) => {
  try {
    const [servicios] = await db.query(
      "SELECT id, nombre, precio, porcentaje_iva FROM servicios_productos"
    );

    const [clientes] = await db.query(`
      SELECT 
        c.id, c.nombre, c.email, c.telefono, c.direccion, c.identificacion, c.codigo_referencia, 
        s.nombre AS sucursal_nombre
      FROM clientes c
      LEFT JOIN sucursales s ON s.id = c.sucursal_id
      ORDER BY c.id DESC
    `);
   
    const [proveedores] = await db.query("SELECT id, nombre FROM proveedores");

    res.json({
      servicios,
      clientes,
      proveedores,
      tiposRegistro: [
        { id: "cotizacion", nombre: "Cotización" },
        { id: "gasto", nombre: "Gasto" },
      ],
    });
  } catch (error) {
    console.error("Error en getDatosRegistro:", error);
    res
      .status(500)
      .json({ message: "Error al obtener datos para nuevo registro" });
  }
};

export const createRegistro = async (req, res) => {
  const tipo = req.combinedData.tipo; 
  if (!tipo) {
    return res
      .status(400)
      .json({ message: "Debe indicar el tipo de registro" });
  }

  
  const datos = { ...req.body };

  try {
    let resultado;

    if (tipo === "gasto") {
      if (!req.file) {
        return res.status(400).json({
          message: "Para crear un gasto, el comprobante es obligatorio",
        });
      }

      datos.documento = req.file.key;

      resultado = await crearGasto(datos);
    } else if (tipo === "cotizacion") {
      resultado = await crearCotizacionDesdeRegistro(datos);
    } else {
      return res.status(400).json({ message: "Tipo de registro no válido" });
    }

    res.status(201).json(resultado);
  } catch (error) {
    console.error("Error al crear el registro:", error);
    res
      .status(500)
      .json({ message: `Error al crear el registro de tipo ${tipo}` });
  }
};

// Crear gasto
const crearGasto = async (datos) => {
  const {
    proveedor_id,
    concepto_pago,
    tipo_gasto_id,
    descripcion,
    subtotal,
    porcentaje_iva = 0,
    fecha,
    sucursal_id,
    cotizacion_id = null,
    moneda = "USD",
    estado = "pendiente",
    usuario_id,
    documento,
    tasa_cambio = null,
  } = datos;

  // Calcular impuesto y total
  const impuesto = subtotal * (porcentaje_iva / 100);
  const total = subtotal + impuesto;

  // Consultar tipo de gasto para determinar si requiere proveedor o cotización
  const [[tipoGasto]] = await db.query(
    "SELECT rentable, nombre FROM tipos_gasto WHERE id = ?",
    [tipo_gasto_id]
  );

  if (!tipoGasto) {
    throw new Error("Tipo de gasto no válido.");
  }

  const esRentable = tipoGasto.rentable === 1;
  const esProveedor =
    tipoGasto.nombre.includes("Proveedor") ||
    tipoGasto.nombre.includes("Servicio Prestado");

  const proveedorFinal = esProveedor ? proveedor_id : null;
  const cotizacionFinal = esRentable ? cotizacion_id : null;

  const descripcionFinal = descripcion || "N/A";
  const conceptoFinal = concepto_pago || "N/A";

  // Insertar el gasto
  const [result] = await db.query(
    `INSERT INTO gastos (
      proveedor_id, concepto_pago, tipo_gasto_id,
      descripcion, subtotal, porcentaje_iva, impuesto, total,
      fecha, sucursal_id, cotizacion_id,
      moneda, tasa_cambio,
      documento,
      estado, usuario_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proveedorFinal,
      conceptoFinal,
      tipo_gasto_id,
      descripcionFinal,
      subtotal,
      porcentaje_iva,
      impuesto,
      total,
      fecha,
      sucursal_id,
      cotizacionFinal,
      moneda,
      tasa_cambio,
      documento,
      estado,
      usuario_id,
      new Date(),
      new Date(),
    ]
  );

  const gastoId = result.insertId;
  const codigoGenerado = `G-${String(gastoId).padStart(6, "0")}`;

  // Asignar código único
  await db.query(`UPDATE gastos SET codigo = ? WHERE id = ?`, [
    codigoGenerado,
    gastoId,
  ]);

  return {
    message: "Gasto creado con éxito",
    registro_id: gastoId,
    codigo: codigoGenerado,
    tipo: "gasto",
  };
};

export const getTiposGasto = async (req, res) => {
  try {
    const [tipos] = await db.query(
      "SELECT id, nombre, descripcion, rentable FROM tipos_gasto"
    );
    res.json(tipos);
  } catch (error) {
    console.error("Error al obtener tipos de gasto:", error);
    res.status(500).json({ message: "Error al obtener tipos de gasto" });
  }
};

export const crearCotizacionDesdeRegistro = async (datos) => {
  let {
    cliente_id,
    usuario_id,
    sucursal_id,
    estado = "pendiente",
    confirmacion_cliente = false,
    observaciones = "",
    operacion,
    puerto,
    bl,
    mercancia,
    contenedor,
    detalle,
    total,
    fecha = new Date(),
  } = datos;

  try {
    if (
      !sucursal_id ||
      sucursal_id === "null" ||
      sucursal_id === "" ||
      sucursal_id === 0
    ) {
      const [cliente] = await db.query(
        "SELECT sucursal_id FROM clientes WHERE id = ?",
        [cliente_id]
      );
      if (cliente.length === 0) {
        throw new Error("Cliente no encontrado para asignar sucursal.");
      }
      sucursal_id = cliente[0].sucursal_id;
    }

    if (!sucursal_id) {
      throw new Error("El cliente no tiene una sucursal asignada.");
    }

    let subtotalGlobal = 0;
    let impuestoGlobal = 0;

    const [result] = await db.query(
      `INSERT INTO cotizaciones 
       (cliente_id, usuario_id, sucursal_id, fecha, subtotal, impuesto, total, estado, confirmacion_cliente, observaciones,
        operacion, puerto, bl, mercancia, contenedor) 
       VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_id,
        usuario_id,
        sucursal_id,
        fecha,
        total,
        estado,
        confirmacion_cliente,
        observaciones,
        operacion,
        puerto,
        bl,
        mercancia,
        contenedor,
      ]
    );

    const cotizacionId = result.insertId;

    const codigo = `COT-${String(cotizacionId).padStart(4, "0")}`;
    await db.query(
      `UPDATE cotizaciones SET codigo_referencia = ? WHERE id = ?`,
      [codigo, cotizacionId]
    );

    for (const item of detalle) {
      const {
        servicio_productos_id,
        cantidad,
        precio_unitario,
        porcentaje_iva = 16,
      } = item;

      const cant = Number(cantidad);
      const precio = Number(precio_unitario);
      const iva = Number(porcentaje_iva);

      if (isNaN(cant) || isNaN(precio) || isNaN(iva)) {
        throw new Error(
          `Error en los valores del detalle para el servicio con ID ${servicio_productos_id}`
        );
      }

      const [productos] = await db.query(
        `SELECT tipo, cantidad_actual FROM servicios_productos WHERE id = ?`,
        [servicio_productos_id]
      );

      if (productos.length === 0) {
        throw new Error("Producto o servicio no encontrado");
      }

      const { tipo, cantidad_actual } = productos[0];

      if (tipo === "producto" && cant > cantidad_actual) {
        throw new Error(
          `Stock insuficiente para el producto con ID ${servicio_productos_id}`
        );
      }

      if (tipo === "producto") {
        await db.query(
          `UPDATE servicios_productos SET cantidad_actual = cantidad_actual - ? WHERE id = ?`,
          [cant, servicio_productos_id]
        );
      }

      const subtotal = cant * precio;
      const impuesto = subtotal * (iva / 100);
      const totalItem = subtotal + impuesto;

      subtotalGlobal += subtotal;
      impuestoGlobal += impuesto;

      await db.query(
        `INSERT INTO detalle_cotizacion 
         (cotizacion_id, servicio_productos_id, cantidad, precio_unitario, porcentaje_iva, subtotal, impuesto, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cotizacionId,
          servicio_productos_id,
          cant,
          precio,
          iva,
          subtotal,
          impuesto,
          totalItem,
        ]
      );
    }

    const totalGlobal = subtotalGlobal + impuestoGlobal;
    await db.query(
      `UPDATE cotizaciones SET subtotal = ?, impuesto = ?, total = ? WHERE id = ?`,
      [subtotalGlobal, impuestoGlobal, totalGlobal, cotizacionId]
    );

    return {
      message: "Cotización creada con éxito",
      registro_id: cotizacionId,
      codigo,
      tipo: "cotizacion",
    };
  } catch (error) {
    console.error("Error en crearCotizacionDesdeRegistro:", error);
    throw error;
  }
};

export const generarVistaPreviaCotizacion = async (req, res) => {
  try {
    const datosCotizacion = req.body.datos;
    if (!datosCotizacion)
      return res.status(400).json({
        message: "Faltan datos de cotización para generar la vista previa.",
      });

    // 1) Plantilla HTML
    const html = generarHTMLCotizacion(datosCotizacion, "preview");

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    // 3) Render y PDF
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    // 4) Respuesta
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=preview-cotizacion.pdf",
      })
      .send(pdfBuffer);
  } catch (error) {
    console.error("Error generando vista previa de cotización:", error);
    res
      .status(500)
      .json({ message: "Error al generar la vista previa de cotización" });
  }
};
