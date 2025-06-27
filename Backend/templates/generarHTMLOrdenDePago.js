// templates/generarHTMLOrdenPago.js
export function generarHTMLOrdenPago(datos = {}, modo = "preview") {
  const {
    codigo = "N/A",
    fecha_solicitud = null,
    estado = "pendiente",
    solicitado_por = "N/A",
    aprobado_por = "N/A",
    metodo_pago = "N/A",
    banco = "—",
    referencia = "—",
    subtotal = 0,
    porcentaje_iva = 0,
    impuesto = 0,
    total = 0,
    observaciones = "",
    created_at = null,
    updated_at = null,
  } = datos;

  // --- fecha legible
  const fechaMostrar = fecha_solicitud
    ? new Date(fecha_solicitud).toLocaleDateString("es-VE")
    : "Sin especificar";

  // --- Cuerpo principal (no hay lista de ítems; es un único registro)
  const detallePago = `
    <tr class="border-t">
      <td class="py-2 px-2">${metodo_pago}</td>
      <td>${banco}</td>
      <td>${referencia}</td>
      <td>$${parseFloat(total).toFixed(2)}</td>
    </tr>
  `;

  return `
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <script src="https://cdn.tailwindcss.com"></script>
      <title>Orden de Pago</title>
    </head>
    <body class="bg-white p-8 text-gray-900 border-2">

      <!-- ENCABEZADO -->
      <div class="flex justify-between mb-6">
        <div>
          ${
            modo === "final"
              ? `<h2 class="text-xl font-bold mb-2">ORDEN DE PAGO: ${codigo}</h2>`
              : `<h2 class="text-xl font-bold mb-2">ORDEN DE PAGO (Preview)</h2>`
          }
          <p class="text-xs font-semibold bg-yellow-300 inline-block px-2 mb-1">
            FECHA DE SOLICITUD: ${fechaMostrar}
          </p>
          <h2 class="font-bold text-sm">ESTADO: ${estado}</h2>
          <h2 class="font-bold text-sm">SOLICITADO POR: ${solicitado_por}</h2>
          <h2 class="font-bold text-sm">APROBADO POR: ${aprobado_por}</h2>
        </div>
        <div class="text-right text-sm">
          <p>MÉTODO DE PAGO: ${metodo_pago}</p>
          ${
            metodo_pago.toUpperCase() === "TRANSFERENCIA"
              ? `<p>BANCO: ${banco}</p><p>REFERENCIA: ${referencia}</p>`
              : ""
          }
        </div>
      </div>

      <!-- OBSERVACIONES -->
      ${
        observaciones
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
              <th class="py-2 px-2">MÉTODO</th>
              <th class="py-2 px-2">BANCO</th>
              <th class="py-2 px-2">REFERENCIA</th>
              <th class="py-2 px-2">MONTO</th>
            </tr>
          </thead>
          <tbody>
            ${detallePago}
          </tbody>
        </table>
      </div>

      <!-- TOTALES -->
      <div class="flex justify-end">
        <table class="text-xs text-right w-72">
          <tbody class="bg-blue-800 text-white border-2">
            <tr>
              <td class="font-bold p-2 border-2">BASE IMPONIBLE USD:</td>
              <td class="p-2 border-2">$${parseFloat(subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="font-bold p-2 border-2">IVA (${porcentaje_iva}%):</td>
              <td class="p-2 border-2">$${parseFloat(impuesto).toFixed(2)}</td>
            </tr>
            <tr>
              <td class="font-bold p-2 border-2">TOTAL A PAGAR USD:</td>
              <td class="p-2 border-2">$${parseFloat(total).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- AUDITORÍA -->
        <div class="mt-6 text-[10px] text-gray-600">
          <table class="w-full text-xs border">
    <thead class="bg-gray-200">
      <tr>
        <th class="border">Solicitado por:</th>
        <th class="border">Autorizado por:</th>
        <th class="border">Aprobado por:</th>
      </tr>
    </thead>
    <tbody>
      <tr class="h-24 align-top"> <!-- espacio para la gráfica -->
        <td class="border">
          ${
            firmaSolicita
              ? `<img src="${firmaSolicita}" class="h-20 mx-auto" />`
              : ""
          }
        </td>
        <td class="border">
          ${
            firmaAutoriza
              ? `<img src="${firmaAutoriza}" class="h-20 mx-auto" />`
              : ""
          }
        </td>
        <td class="border">
          ${
            firmaAprueba
              ? `<img src="${firmaAprueba}" class="h-20 mx-auto" />`
              : ""
          }
        </td>
      </tr>
      <tr>
        <td class="border text-center font-semibold">${solicitado_por}</td>
        <td class="border text-center font-semibold">${autorizado_por}</td>
        <td class="border text-center font-semibold">${aprobado_por}</td>
      </tr>
    </tbody>
  </table>
    </body>
    </html>
  `;
}
