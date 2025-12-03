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
    logo = null, // 🔹 viene desde el controlador en base64
  } = datos || {};

  const clienteMostrar = cliente || cliente_nombre || "N/A";
  const fechaMostrar = fecha_emision || fecha || null;

  // --- Cuerpo de la tabla
  let cuerpoTabla = "";

  if (modo === "preview") {
    // --- SERVICIOS (preview)
    if (servicios.length > 0) {
      cuerpoTabla += `
        <tr class="bg-blue-100 font-semibold text-left">
          <td colspan="5" class="py-1 pl-2">Servicios</td>
        </tr>
      `;
      cuerpoTabla += servicios
        .map(
          (item, indice) => `
        <tr class="border-t ${indice % 2 === 0 ? "bg-white" : "bg-gray-50"}">
          <td class="py-2 px-2 text-left">${item.nombre}</td>
          <td class="text-center">${item.cantidad}</td>
          <td class="text-right pr-3">$${parseFloat(
            item.precioUnitario
          ).toFixed(2)}</td>
          <td class="text-center">$${parseFloat(item.iva).toFixed(2)}</td>
          <td class="text-right pr-3">$${parseFloat(item.total).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");
    }
    // --- PRODUCTOS (preview)
    if (productos.length > 0) {
      cuerpoTabla += `
        <tr class="bg-blue-100 font-semibold text-left">
          <td colspan="5" class="py-1 pl-2">Productos</td>
        </tr>
      `;
      cuerpoTabla += productos
        .map(
          (item, indice) => `
        <tr class="border-t ${indice % 2 === 0 ? "bg-white" : "bg-gray-50"}">
          <td class="py-2 px-2 text-left">${item.nombre}</td>
          <td class="text-center">${item.cantidad}</td>
          <td class="text-right pr-3">$${parseFloat(
            item.precioUnitario
          ).toFixed(2)}</td>
          <td class="text-center">$${parseFloat(item.iva).toFixed(2)}</td>
          <td class="text-right pr-3">$${parseFloat(item.total).toFixed(2)}</td>
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
            (item, indice) => `
          <tr class="border-t ${indice % 2 === 0 ? "bg-white" : "bg-gray-50"}">
            <td class="py-2 px-2 text-left">${item.servicio}</td>
            <td class="text-center">${item.cantidad}</td>
            <td class="text-right pr-3">$${parseFloat(
              item.precio_unitario
            ).toFixed(2)}</td>
            <td class="text-center">${parseFloat(item.porcentaje_iva).toFixed(
              2
            )}%</td>
            <td class="text-right pr-3">$${parseFloat(item.total).toFixed(
              2
            )}</td>
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
            (item, indice) => `
          <tr class="border-t ${indice % 2 === 0 ? "bg-white" : "bg-gray-50"}">
            <td class="py-2 px-2 text-left">${item.servicio}</td>
            <td class="text-center">${item.cantidad}</td>
            <td class="text-right pr-3">$${parseFloat(
              item.precio_unitario
            ).toFixed(2)}</td>
            <td class="text-center">${parseFloat(item.porcentaje_iva).toFixed(
              2
            )}%</td>
            <td class="text-right pr-3">$${parseFloat(item.total).toFixed(
              2
            )}</td>
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
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            font-family: 'Helvetica', Arial, sans-serif;
          }
        </style>
      </head>
      <body class="bg-gray-100 p-6 text-gray-900">
        <div class="max-w-4xl mx-auto bg-white border rounded-lg shadow-lg overflow-hidden">

          <!-- ENCABEZADO CON LOGO Y DATOS -->
          <div class="bg-blue-800 text-white px-6 py-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                ${
                  logo
                    ? `<img src="${logo}" class="h-14 w-auto object-contain bg-white rounded-md p-1" />`
                    : ""
                }
                <div>
                  <h2 class="text-lg font-bold tracking-wide">
                    ${
                      modo === "final" && codigo
                        ? `Cotización: ${codigo}`
                        : "COTIZACIÓN (Preview)"
                    }
                  </h2>
                  <p class="text-xs mt-1">
                    EMPRESA: <span class="font-semibold">Point Technology C.A.</span>
                  </p>
                  <p class="text-xs">
                    CLIENTE: <span class="font-semibold">${clienteMostrar}</span>
                  </p>
                </div>
              </div>
              <div class="text-right text-xs space-y-1">
                <div class="inline-block bg-yellow-300 text-blue-900 font-semibold px-2 py-1 rounded">
                  FECHA: ${
                    fechaMostrar
                      ? new Date(fechaMostrar).toLocaleDateString("es-VE")
                      : "No especificada"
                  }
                </div>
                ${
                  modo === "final" && estado
                    ? `<div class="mt-2 inline-block bg-white text-blue-800 font-bold px-3 py-1 rounded shadow-sm">
                        ${estado.toUpperCase()}
                      </div>`
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- BLOQUE RESUMEN -->
          <div class="px-6 py-4 border-b bg-gray-50">
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div class="space-y-1">
                <p>
                  <span class="font-semibold">Sucursal:</span>
                  ${sucursal || "N/A"}
                </p>
                <p>
                  <span class="font-semibold">Declarante:</span>
                  <span class="bg-yellow-300 px-1 text-gray-900">${
                    declarante || "N/A"
                  }</span>
                </p>
              </div>
              <div class="space-y-1">
                <p><span class="font-semibold">Operación:</span> ${
                  operacion || "N/A"
                }</p>
                <p><span class="font-semibold">Mercancía:</span> ${
                  mercancia || "N/A"
                }</p>
                <p><span class="font-semibold">BL:</span> ${bl || "N/A"}</p>
                <p><span class="font-semibold">Contenedor:</span> ${
                  contenedor || "N/A"
                }</p>
                <p><span class="font-semibold">Puerto de descarga:</span> ${
                  puerto || "N/A"
                }</p>
              </div>
            </div>
          </div>

          <!-- OBSERVACIONES -->
          ${
            modo === "final" && observaciones
              ? `
              <div class="px-6 py-4 border-b">
                <div class="bg-gray-100 rounded-md border px-4 py-3">
                  <h3 class="text-sm font-bold mb-1 text-gray-800">Observaciones:</h3>
                  <p class="text-xs leading-relaxed">${observaciones}</p>
                </div>
              </div>
            `
              : ""
          }

          <!-- TABLA PRINCIPAL -->
          <div class="px-6 py-4">
            <div class="border border-gray-300 rounded-md overflow-hidden">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="bg-blue-800 text-white">
                    <th class="py-2 px-2 text-left">CONCEPTO</th>
                    <th class="py-2 px-2 text-center">CANTIDAD</th>
                    <th class="py-2 px-2 text-right">PRECIO UNITARIO</th>
                    <th class="py-2 px-2 text-center">IVA</th>
                    <th class="py-2 px-2 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuerpoTabla}
                </tbody>
              </table>
            </div>
          </div>

          <!-- TOTALES -->
          <div class="px-6 pb-6 flex justify-end">
            <div class="w-72">
              <table class="w-full text-xs text-right border-collapse shadow-sm rounded-md overflow-hidden">
                <tbody>
                  <tr class="bg-blue-900 text-white">
                    <td class="font-bold p-2 border border-blue-900 text-left">
                      BASE IMPONIBLE USD:
                    </td>
                    <td class="p-2 border border-blue-900">
                      $${parseFloat(subtotal).toFixed(2)}
                    </td>
                  </tr>
                  <tr class="bg-blue-800 text-white">
                    <td class="font-bold p-2 border border-blue-900 text-left">
                      IVA:
                    </td>
                    <td class="p-2 border border-blue-900">
                      $${parseFloat(impuesto).toFixed(2)}
                    </td>
                  </tr>
                  <tr class="bg-blue-700 text-white">
                    <td class="font-bold p-2 border border-blue-900 text-left">
                      TOTAL A PAGAR USD:
                    </td>
                    <td class="p-2 border border-blue-900 font-semibold">
                      $${parseFloat(total).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </body>
    </html>
  `;
}
