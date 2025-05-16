export function generarHTMLCotizacion(datos, modo = "preview") {
  const {
    codigo,
    cliente,
    cliente_nombre,
    fecha,
    fecha_emision,
    declarante,
    sucursal,
    estado,
    observaciones,
    operacion,
    mercancia,
    bl,
    contenedor,
    puerto,
    servicios = [],
    productos = [],
    detalle = [],
    subtotal = 0,
    impuesto = 0,
    total = 0,
  } = datos || {};

  const clienteMostrar = cliente || cliente_nombre || "N/A";
  const fechaMostrar = fecha_emision || fecha || null;

  // --- Cuerpo de la tabla
  let cuerpoTabla = "";

  if (modo === "preview") {
    // --- SERVICIOS
    if (servicios.length > 0) {
      cuerpoTabla += `
        <tr class="bg-blue-100 font-semibold text-left">
          <td colspan="5" class="py-1 pl-2">Servicios</td>
        </tr>
      `;
      cuerpoTabla += servicios
        .map(
          (item) => `
        <tr class="border-t">
          <td class="py-2 px-2">${item.nombre}</td>
          <td>${item.cantidad}</td>
          <td>$${parseFloat(item.precioUnitario).toFixed(2)}</td>
          <td>$${parseFloat(item.iva).toFixed(2)}</td>
          <td>$${parseFloat(item.total).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");
    }
    // --- PRODUCTOS
    if (productos.length > 0) {
      cuerpoTabla += `
        <tr class="bg-blue-100 font-semibold text-left">
          <td colspan="5" class="py-1 pl-2">Productos</td>
        </tr>
      `;
      cuerpoTabla += productos
        .map(
          (item) => `
        <tr class="border-t">
          <td class="py-2 px-2">${item.nombre}</td>
          <td>${item.cantidad}</td>
          <td>$${parseFloat(item.precioUnitario).toFixed(2)}</td>
          <td>$${parseFloat(item.iva).toFixed(2)}</td>
          <td>$${parseFloat(item.total).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");
    }
  } else if (modo === "final") {
    if (detalle.length > 0) {
      const serviciosFinal = detalle.filter((item) => item.tipo === "servicio");
      const productosFinal = detalle.filter((item) => item.tipo === "producto");

      if (serviciosFinal.length > 0) {
        cuerpoTabla += `
      <tr class="bg-blue-100 font-semibold text-left">
        <td colspan="5" class="py-1 pl-2">Servicios</td>
      </tr>
    `;
        cuerpoTabla += serviciosFinal
          .map(
            (item) => `
      <tr class="border-t">
        <td class="py-2 px-2">${item.servicio}</td>
        <td>${item.cantidad}</td>
        <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
        <td>${parseFloat(item.porcentaje_iva).toFixed(2)}%</td>
        <td>$${parseFloat(item.total).toFixed(2)}</td>
      </tr>
    `
          )
          .join("");
      }

      if (productosFinal.length > 0) {
        cuerpoTabla += `
      <tr class="bg-blue-100 font-semibold text-left">
        <td colspan="5" class="py-1 pl-2">Productos</td>
      </tr>
    `;
        cuerpoTabla += productosFinal
          .map(
            (item) => `
      <tr class="border-t">
        <td class="py-2 px-2">${item.servicio}</td>
        <td>${item.cantidad}</td>
        <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
        <td>${parseFloat(item.porcentaje_iva).toFixed(2)}%</td>
        <td>$${parseFloat(item.total).toFixed(2)}</td>
      </tr>
    `
          )
          .join("");
      }
    }
  }

  if (!cuerpoTabla) {
    cuerpoTabla = `<tr><td colspan="5" class="py-4 text-center">No hay productos ni servicios.</td></tr>`;
  }

  return `
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Cotización</title>
      </head>
      <body class="bg-white p-8 text-gray-900 border-2">

        <!-- ENCABEZADO -->
        <div class="flex justify-between mb-6">
          <div>
            ${
              modo === "final" && codigo
                ? `<h2 class="text-xl font-bold mb-2">Cotización: ${codigo}</h2>`
                : `<h2 class="text-xl font-bold mb-2">COTIZACIÓN (Preview)</h2>`
            }
            <p class="text-xs font-semibold bg-yellow-300 inline-block px-2 mb-1">
              FECHA DE EMISIÓN: ${
                fechaMostrar
                  ? new Date(fechaMostrar).toLocaleDateString("es-VE")
                  : "No especificada"
              }
            </p>
            <h2 class="font-bold text-sm">EMPRESA: Point Technology C.A.</h2>
            <h2 class="font-bold text-sm">CLIENTE: ${clienteMostrar}</h2>
            ${
              modo === "final" && sucursal
                ? `<h2 class="font-bold text-sm">SUCURSAL: ${sucursal}</h2>`
                : ""
            }
            ${
              modo === "final" && estado
                ? `<h2 class="font-bold text-sm">ESTADO: ${estado}</h2>`
                : ""
            }
            <h2 class="font-bold text-sm">
              DECLARANTE: <span class="bg-yellow-300">${
                declarante || "N/A"
              }</span>
            </h2>
          </div>
          <div class="text-right text-sm">
            <p>OPERACIÓN: ${operacion || "N/A"}</p>
            <p>MERCANCÍA: ${mercancia || "N/A"}</p>
            <p>BL: ${bl || "N/A"}</p>
            <p>CONTENEDOR: ${contenedor || "N/A"}</p>
            <p>PUERTO DE DESCARGA: ${puerto || "N/A"}</p>
          </div>
        </div>

        <!-- OBSERVACIONES -->
        ${
          modo === "final" && observaciones
            ? `
            <div class="mb-6 p-4 bg-gray-100 rounded border">
              <h3 class="text-sm font-bold mb-2">Observaciones:</h3>
              <p class="text-xs">${observaciones}</p>
            </div>
            `
            : ""
        }

        <!-- TABLA PRINCIPAL -->
        <div class="border-black border-2">
          <table class="w-full text-xs text-center border-collapse">
            <thead class="bg-blue-800 text-white">
              <tr>
                <th class="py-2 px-2">CONCEPTO</th>
                <th class="py-2 px-2">CANTIDAD</th>
                <th class="py-2 px-2">PRECIO UNITARIO</th>
                <th class="py-2 px-2">IVA</th>
                <th class="py-2 px-2">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${cuerpoTabla}
            </tbody>
          </table>
        </div>

        <!-- TOTALES -->
        <div class="flex justify-end">
          <table class="text-xs text-right w-80">
            <tbody class="bg-blue-800 text-white border-2">
              <tr>
                <td class="font-bold p-2 border-2">BASE IMPONIBLE USD:</td>
                <td class="p-2 border-2">$${parseFloat(subtotal).toFixed(
                  2
                )}</td>
              </tr>
              <tr>
                <td class="font-bold p-2 border-2">IVA:</td>
                <td class="p-2 border-2">$${parseFloat(impuesto).toFixed(
                  2
                )}</td>
              </tr>
              <tr>
                <td class="font-bold p-2 border-2">TOTAL A PAGAR USD:</td>
                <td class="p-2 border-2">$${parseFloat(total).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </body>
    </html>
  `;
}
