import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generarHTMLCotizacion } from "../../templates/generarHTMLCotizacion.js";
import path from "path";
import { fileURLToPath } from "url";
import db from "../config/database.js";
import { s3 } from "../utils/s3.js";
import { obtenerOcrearGrupoFactura } from "../utils/gruposArchivos.js";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import cacheMemoria from "../utils/cacheMemoria.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// registros.controller.js
export const getDatosRegistro = async (req, res) => {
  try {
    const esAdmin = Number(req.user?.rolId ?? req.user?.rol_id) === 1;
    const sucursalIdUsuario = Number(
      req.user?.sucursalId ?? req.user?.sucursal_id,
    );

    const key = esAdmin
      ? "datosRegistro_v1_admin"
      : `datosRegistro_v1_sucursal_${sucursalIdUsuario}`;

    const hit = cacheMemoria.get(key);
    if (hit) return res.json(hit);

    const [servicios] = await db.query(
      "SELECT id, nombre, precio, porcentaje_iva FROM servicios_productos",
    );

    // ✅ Clientes filtrados por sucursal (solo no-admin)
    const [clientes] = await db.query(
      `
      SELECT 
        c.id, c.nombre, c.email, c.telefono, c.direccion, c.identificacion, c.codigo_referencia,
        c.sucursal_id,
        s.nombre AS sucursal_nombre
      FROM clientes c
      LEFT JOIN sucursales s ON s.id = c.sucursal_id
      ${esAdmin ? "" : "WHERE c.sucursal_id = ?"}
      ORDER BY c.id DESC
      `,
      esAdmin ? [] : [sucursalIdUsuario],
    );

    const [proveedores] = await db.query("SELECT id, nombre FROM proveedores");

    const respuesta = {
      servicios,
      clientes,
      proveedores,
      tiposRegistro: [
        { id: "cotizacion", nombre: "Cotización" },
        { id: "gasto", nombre: "Gasto" },
      ],
    };

    cacheMemoria.set(key, respuesta, 300); // TTL 5 min
    return res.json(respuesta);
  } catch (error) {
    console.error("Error en getDatosRegistro:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener datos para nuevo registro" });
  }
};

// SOLO LA FUNCIÓN QUE CAMBIA
export const createRegistro = async (req, res) => {
  if (!req.combinedData) {
    return res.status(400).json({
      message: "No se recibieron los datos del registro.",
    });
  }

  const datos = { ...req.combinedData };
  if (datos.usuario && !datos.creadoPor)
    datos.creadoPor = Number(datos.usuario);

  const tipoNormalizado = (datos.tipo || "").trim().toLowerCase();

  const esAdmin = Number(req.user?.rolId ?? req.user?.rol_id) === 1;
  const sucursalIdUsuario = Number(
    req.user?.sucursalId ?? req.user?.sucursal_id,
  );

  const conexion = await db.getConnection();
  let claveS3 = null;

  try {
    if (tipoNormalizado === "gasto") {
      await conexion.beginTransaction();

      // ✅ Validación/forzado de sucursal en GASTO
      // - admin: puede elegir
      // - no admin: debe ser su sucursal
      const sucursalIdEnviada =
        datos.sucursal_id == null ? null : Number(datos.sucursal_id);

      if (!esAdmin) {
        if (sucursalIdEnviada && sucursalIdEnviada !== sucursalIdUsuario) {
          await conexion.rollback();
          return res.status(403).json({
            message:
              "No tienes permiso para registrar gastos en otra sucursal.",
          });
        }
        datos.sucursal_id = sucursalIdUsuario;
      } else {
        // admin: si no envía sucursal, usamos la suya (por defecto)
        if (!sucursalIdEnviada) datos.sucursal_id = sucursalIdUsuario;
      }

      const resultado = await crearGasto(datos, conexion);
      const { registro_id: registroId, codigo } = resultado;

      // (Tu bloque actual de subida a S3 y auditoría se mantiene igual)
      if (req.file) {
        const meses = [
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "septiembre",
          "octubre",
          "noviembre",
          "diciembre",
        ];
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mesPalabra = meses[ahora.getMonth()];
        const nombreSeguro = req.file.originalname.replace(/\s+/g, "_");
        claveS3 = `facturas_gastos/${anio}/${mesPalabra}/${codigo}/${Date.now()}-${nombreSeguro}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: claveS3,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "private",
          }),
        );

        await conexion.query(`UPDATE gastos SET documento = ? WHERE id = ?`, [
          claveS3,
          registroId,
        ]);

        const extension = path.extname(req.file.originalname).substring(1);
        const tamanioBytes = req.file.size;

        const grupoArchivoId = await obtenerOcrearGrupoFactura(
          conexion,
          registroId,
          datos.creadoPor,
        );

        const [[{ maxVer }]] = await conexion.query(
          `SELECT IFNULL(MAX(numeroVersion),0) AS maxVer
           FROM archivos
           WHERE registroTipo = 'facturasGastos' AND registroId = ?`,
          [registroId],
        );
        const numeroVersion = (maxVer || 0) + 1;

        const [resArchivo] = await conexion.query(
          `INSERT INTO archivos
           (registroTipo, registroId, grupoArchivoId,
            nombreOriginal, extension, tamanioBytes,
            rutaS3, numeroVersion, estado,
            subidoPor, creadoEn, actualizadoEn)
           VALUES ('facturasGastos', ?, ?, ?, ?, ?, ?, ?, 'activo',
                   ?, NOW(), NOW())`,
          [
            registroId,
            grupoArchivoId,
            req.file.originalname,
            extension,
            tamanioBytes,
            claveS3,
            numeroVersion,
            datos.creadoPor,
          ],
        );
        const archivoId = resArchivo.insertId;

        const [resVersion] = await conexion.query(
          `INSERT INTO versionesArchivo
           (archivoId, numeroVersion, nombreOriginal, extension,
            tamanioBytes, rutaS3, subidoPor)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            archivoId,
            numeroVersion,
            req.file.originalname,
            extension,
            tamanioBytes,
            claveS3,
            datos.creadoPor,
          ],
        );
        const versionId = resVersion.insertId;

        await conexion.query(
          `INSERT INTO eventosArchivo
           (archivoId, versionId, accion, creadoPor, ip, userAgent, detalles)
           VALUES (?, ?, 'subidaArchivo', ?, ?, ?, ?)`,
          [
            archivoId,
            versionId,
            datos.creadoPor,
            req.ip || null,
            req.get("user-agent") || null,
            JSON.stringify({
              nombreOriginal: req.file.originalname,
              extension,
              ruta: claveS3,
            }),
          ],
        );

        await conexion.query(
          `UPDATE usuarios
             SET usoStorageBytes = usoStorageBytes + ?
           WHERE id = ?`,
          [tamanioBytes, datos.creadoPor],
        );
      }

      await conexion.commit();

      // ✅ Adjuntar sucursal al response
      const [[filaSucursal]] = await db.query(
        `SELECT s.id AS sucursalId, s.nombre AS sucursalNombre
           FROM gastos g
           LEFT JOIN sucursales s ON s.id = g.sucursal_id
          WHERE g.id = ?
          LIMIT 1`,
        [registroId],
      );

      return res.status(201).json({
        ...resultado,
        sucursalId: filaSucursal?.sucursalId ?? datos.sucursal_id ?? null,
        sucursalNombre: filaSucursal?.sucursalNombre ?? null,
      });
    }

    if (tipoNormalizado === "cotizacion") {
      // ✅ Nueva lógica:
      // - clientes.sucursal_id = sucursalBase (informativa / pertenencia)
      // - cotizaciones.sucursal_id = sucursalAtencion (donde se emitió)
      // - no-admin: sucursalAtencion SIEMPRE debe ser la del usuario
      const clienteId = Number(datos.cliente_id);
      if (!clienteId) {
        return res.status(400).json({ message: "cliente_id es requerido." });
      }

      // 1) Validar que el cliente exista (y opcionalmente que tenga sucursal base)
      const [[filaCliente]] = await db.query(
        `SELECT id, sucursal_id
       FROM clientes
      WHERE id = ?
      LIMIT 1`,
        [clienteId],
      );

      if (!filaCliente?.id) {
        return res.status(404).json({ message: "Cliente no encontrado." });
      }

      // Si quieres mantener la regla de “cliente debe tener sucursal base”, déjalo:
      if (!filaCliente?.sucursal_id) {
        return res.status(400).json({
          message: "El cliente no tiene una sucursal asignada (sucursal base).",
        });
      }

      // 2) Determinar sucursalAtencion (la que va en la cotización)
      const sucursalAtencionEnviada =
        datos.sucursal_id == null ||
        datos.sucursal_id === "" ||
        datos.sucursal_id === "null"
          ? null
          : Number(datos.sucursal_id);

      let sucursalAtencionId = sucursalAtencionEnviada;

      if (!esAdmin) {
        // no-admin: forzamos la sucursal del usuario (solo puede atender en su sucursal)
        if (sucursalAtencionId && sucursalAtencionId !== sucursalIdUsuario) {
          return res.status(403).json({
            message: "No tienes permiso para cotizar en otra sucursal.",
          });
        }
        sucursalAtencionId = sucursalIdUsuario;
      } else {
        // admin: si no envía sucursal, por defecto usamos la suya
        if (!sucursalAtencionId) sucursalAtencionId = sucursalIdUsuario;
      }

      // 3) Forzar sucursalAtencion en el payload que baja a crearCotizacionDesdeRegistro
      datos.sucursal_id = sucursalAtencionId;

      const resultado = await crearCotizacionDesdeRegistro(datos);

      // 4) Adjuntar sucursalAtencion al response (la sucursal real de la cotización)
      const [[filaSucursal]] = await db.query(
        `SELECT s.id AS sucursalId, s.nombre AS sucursalNombre
       FROM sucursales s
      WHERE s.id = ?
      LIMIT 1`,
        [sucursalAtencionId],
      );

      return res.status(201).json({
        ...resultado,
        sucursalId: filaSucursal?.sucursalId ?? sucursalAtencionId,
        sucursalNombre: filaSucursal?.sucursalNombre ?? null,
        // opcional: devolver también sucursal base del cliente para UI/reportes
        sucursalBaseClienteId: Number(filaCliente.sucursal_id) || null,
      });
    }

    return res.status(400).json({ message: "Tipo de registro no válido." });
  } catch (error) {
    await conexion.rollback();

    if (claveS3) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: claveS3,
          }),
        );
      } catch (err) {
        console.error("Error al eliminar archivo de S3 tras fallo:", err);
      }
    }

    console.error("Error al crear el registro:", error);
    return res
      .status(500)
      .json({ message: "Error interno al crear el registro" });
  } finally {
    conexion.release();
  }
};

// Crear gasto
const crearGasto = async (datos, conn) => {
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
    creadoPor,
    documento,
    tasa_cambio = null,
  } = datos;

  if (!sucursal_id) {
    throw new Error("El gasto requiere sucursal_id (no puede ser null).");
  }
  // Normalizar números
  const subtotalNum = Number(subtotal) || 0;
  const porcentajeIvaNum = Number(porcentaje_iva) || 0;

  // Calcular impuesto y total
  const impuesto = subtotalNum * (porcentajeIvaNum / 100);
  const total = subtotalNum + impuesto;

  // Consultar tipo de gasto para determinar reglas
  const [[tipoGasto]] = await conn.query(
    "SELECT id, rentable, nombre FROM tipos_gasto WHERE id = ?",
    [tipo_gasto_id],
  );

  if (!tipoGasto) {
    throw new Error("Tipo de gasto no válido.");
  }

  // 🔹 Regla nueva: Operativo (id = 1)
  const esGastoOperativo = tipoGasto.id === 1;
  const esRentable = tipoGasto.rentable === 1;

  // 🔹 Tipos que requieren proveedor
  const esProveedor =
    esGastoOperativo ||
    tipoGasto.nombre.includes("Proveedor") ||
    tipoGasto.nombre.includes("Servicio Prestado");

  const proveedorFinal = esProveedor ? proveedor_id : null;
  const cotizacionFinal = esRentable ? cotizacion_id : null;

  const descripcionFinal = descripcion || "N/A";
  const conceptoFinal = concepto_pago || "N/A";

  // Insertar el gasto
  const [result] = await conn.query(
    `INSERT INTO gastos (
      proveedor_id, concepto_pago, tipo_gasto_id,
      descripcion, subtotal, porcentaje_iva, impuesto, total,
      fecha, sucursal_id, cotizacion_id,
      moneda, tasa_cambio,
      documento,
      estado, creadoPor, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proveedorFinal,
      conceptoFinal,
      tipo_gasto_id,
      descripcionFinal,
      subtotalNum,
      porcentajeIvaNum,
      impuesto,
      total,
      fecha,
      sucursal_id,
      cotizacionFinal,
      moneda,
      tasa_cambio,
      documento,
      estado,
      creadoPor,
      new Date(),
      new Date(),
    ],
  );

  const gastoId = result.insertId;
  const codigoGenerado = `G-${String(gastoId).padStart(6, "0")}`;

  // Asignar código único
  await conn.query(`UPDATE gastos SET codigo = ? WHERE id = ?`, [
    codigoGenerado,
    gastoId,
  ]);

  // Limpiar caches relacionados con gastos/registro
  // registros.controller.js (dentro de crearGasto / donde limpias cache)
  for (const k of cacheMemoria.keys()) {
    if (k.startsWith("gastos_") || k.startsWith("datosRegistro_v1_")) {
      cacheMemoria.del(k);
    }
  }

  return {
    message: "Gasto creado con éxito",
    registro_id: gastoId,
    codigo: codigoGenerado,
    tipo: "gasto",
    nombreOriginal: documento || null,
  };
};

export const getTiposGasto = async (req, res) => {
  try {
    const key = "tiposGasto_todos";
    const hit = cacheMemoria.get(key);
    if (hit) return res.json(hit);
    const [tipos] = await db.query(
      "SELECT id, nombre, descripcion, rentable FROM tipos_gasto",
    );

    cacheMemoria.set(key, tipos, 3600);
    res.json(tipos);
  } catch (error) {
    console.error("Error al obtener tipos de gasto:", error);
    res.status(500).json({ message: "Error al obtener tipos de gasto" });
  }
};

export const crearCotizacionDesdeRegistro = async (datos) => {
  let {
    cliente_id,
    creadoPor,
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
    total, // ⚠️ Se recibe, pero el total real se calcula en backend para evitar inconsistencias
    fecha = new Date(),
  } = datos;

  const conexion = await db.getConnection();

  try {
    await conexion.beginTransaction();

    // 1) Si no viene sucursal_id, por compatibilidad lo tomamos del cliente (modo antiguo)
    //    OJO: con la nueva lógica, createRegistro SIEMPRE debe enviarlo como sucursalAtencion.
    if (
      !sucursal_id ||
      sucursal_id === "null" ||
      sucursal_id === "" ||
      sucursal_id === 0
    ) {
      const [cliente] = await conexion.query(
        "SELECT sucursal_id FROM clientes WHERE id = ?",
        [cliente_id],
      );

      if (cliente.length === 0) {
        throw new Error("Cliente no encontrado para asignar sucursal.");
      }

      sucursal_id = cliente[0].sucursal_id;
    }

    if (!sucursal_id) {
      throw new Error(
        "La cotización requiere sucursal_id (sucursal de atención).",
      );
    }

    // 2) Crear cabecera con importes en 0 (se actualizan al final, ya calculados en backend)
    let subtotalGlobal = 0;
    let impuestoGlobal = 0;

    const [result] = await conexion.query(
      `INSERT INTO cotizaciones 
       (cliente_id, creadoPor, sucursal_id, fecha, subtotal, impuesto, total, estado, confirmacion_cliente, observaciones,
        operacion, puerto, bl, mercancia, contenedor) 
       VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_id,
        creadoPor,
        sucursal_id,
        fecha,
        estado,
        confirmacion_cliente,
        observaciones,
        operacion,
        puerto,
        bl,
        mercancia,
        contenedor,
      ],
    );

    const cotizacionId = result.insertId;

    // 3) Generar código
    const codigo = `COT-${String(cotizacionId).padStart(4, "0")}`;
    await conexion.query(
      `UPDATE cotizaciones SET codigo_referencia = ? WHERE id = ?`,
      [codigo, cotizacionId],
    );

    // 4) Insertar detalle (SIN validación de stock)
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
          `Error en los valores del detalle para el servicio con ID ${servicio_productos_id}`,
        );
      }

      // ✅ Validación mínima: solo verificamos que exista el servicio/producto.
      const [productoServicio] = await conexion.query(
        `SELECT id FROM servicios_productos WHERE id = ?`,
        [servicio_productos_id],
      );

      if (productoServicio.length === 0) {
        throw new Error("Producto o servicio no encontrado");
      }

      const subtotal = cant * precio;
      const impuesto = subtotal * (iva / 100);
      const totalItem = subtotal + impuesto;

      subtotalGlobal += subtotal;
      impuestoGlobal += impuesto;

      await conexion.query(
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
        ],
      );
    }

    // 5) Actualizar totales en cabecera (valores reales)
    const totalGlobal = subtotalGlobal + impuestoGlobal;
    await conexion.query(
      `UPDATE cotizaciones SET subtotal = ?, impuesto = ?, total = ? WHERE id = ?`,
      [subtotalGlobal, impuestoGlobal, totalGlobal, cotizacionId],
    );

    await conexion.commit();

    // 6) Limpiar cache de servicios/productos (si aplica)
    for (const k of cacheMemoria.keys()) {
      if (k.startsWith("servicios_") || k.startsWith("servicio_")) {
        cacheMemoria.del(k);
      }
    }

    return {
      message: "Cotización creada con éxito",
      registro_id: cotizacionId,
      codigo,
      tipo: "cotizacion",
    };
  } catch (error) {
    await conexion.rollback();
    console.error("Error en crearCotizacionDesdeRegistro:", error);
    throw error;
  } finally {
    conexion.release();
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
