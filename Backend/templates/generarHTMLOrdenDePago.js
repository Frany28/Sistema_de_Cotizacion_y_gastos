export function generarHTMLOrdenPago(datos = {}, modo = "preview") {
  const {
    codigo = "N/A",
    fechaSolicitud = null,
    fechaPago = null,
    estado = "pendiente",
    solicitadoPor = "N/A",
    autorizadoPor = "N/A",
    aprobadoPor = "N/A",
    metodoPago = "N/A",
    banco = "—",
    referencia = "—",
    montoSolicitado = 0,
    montoPagado = 0,
    diferencia = 0,
    moneda = "USD",
    tasaCambio = null,
    observaciones = "",
    gasto = {},
    proveedor = null,
    comprobanteUrl = null,
    firmaSolicita = null,
    firmaAutoriza = null,
    firmaAprueba = null,
    createdAt = null,
  } = datos;

  // Formateo de fechas
  const fechaMostrar = fechaSolicitud
    ? new Date(fechaSolicitud).toLocaleDateString("es-VE")
    : "Sin especificar";

  const fechaPagoMostrar = fechaPago
    ? new Date(fechaPago).toLocaleDateString("es-VE")
    : "—";

  const fechaGeneracion = new Date(createdAt || Date.now()).toLocaleDateString(
    "es-VE",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  // Info del gasto
  const gastoInfo =
    gasto && Object.keys(gasto).length > 0
      ? `
      <div class="mb-4 p-3 border rounded">
        <h3 class="font-bold text-sm mb-2 text-blue-800 border-b pb-1">GASTO ASOCIADO</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <p><span class="font-semibold">Código:</span> ${
            gasto.codigo || "—"
          }</p>
          <p><span class="font-semibold">Tipo:</span> ${
            gasto.tipoGasto || "—"
          }</p>
          <p><span class="font-semibold">Total:</span> $${parseFloat(
            gasto.total || 0
          ).toFixed(2)} ${gasto.moneda || ""}</p>
          <p><span class="font-semibold">Tasa Cambio:</span> ${
            gasto.tasaCambio || "N/A"
          }</p>
          ${
            gasto.documentoUrl
              ? `<p class="col-span-2"><a href="${gasto.documentoUrl}" target="_blank" class="text-blue-600 underline">Ver documento del gasto</a></p>`
              : ""
          }
        </div>
      </div>
    `
      : "";

  // Info del proveedor
  const proveedorInfo = proveedor
    ? `
      <div class="mb-4 p-3 border rounded">
        <h3 class="font-bold text-sm mb-2 text-blue-800 border-b pb-1">PROVEEDOR</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <p><span class="font-semibold">Nombre:</span> ${proveedor.nombre}</p>
          ${
            proveedor.rif
              ? `<p><span class="font-semibold">RIF:</span> ${proveedor.rif}</p>`
              : ""
          }
          ${
            proveedor.telefono
              ? `<p><span class="font-semibold">Teléfono:</span> ${proveedor.telefono}</p>`
              : ""
          }
          ${
            proveedor.email
              ? `<p><span class="font-semibold">Email:</span> ${proveedor.email}</p>`
              : ""
          }
        </div>
      </div>
    `
    : "";

  // Observaciones
  const observacionesHtml = observaciones
    ? `
      <div class="mb-4 p-3 border rounded">
        <h3 class="font-bold text-sm mb-2 text-blue-800 border-b pb-1">OBSERVACIONES</h3>
        <p class="text-xs">${observaciones}</p>
      </div>
    `
    : "";

  // Comprobante
  const comprobanteLink = comprobanteUrl
    ? `<a href="${comprobanteUrl}" target="_blank" class="text-blue-600 underline">Ver comprobante</a>`
    : "—";

  return `
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <script src="https://cdn.tailwindcss.com"></script>
      <title>Orden de Pago</title>
      <style>
        @page {
          size: A4;
          margin: 0.5cm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .document-container {
          width: 100%;
          min-height: 100vh;
          padding: 1.5cm;
          box-sizing: border-box;
        }
        .header-title {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .section-title {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .signature-placeholder {
          height: 80px;
          border-bottom: 1px dashed #999;
          margin-top: 15px;
        }
        .amount-value {
          text-align: right;
          padding-right: 15px;
        }
      </style>
    </head>
    <body>
      <div class="document-container">

        <!-- Encabezado principal -->
        <div class="mb-6 border-b pb-4">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="header-title font-bold">
                ${
                  modo === "final"
                    ? `ORDEN DE PAGO #${codigo}`
                    : `BORRADOR DE ORDEN DE PAGO`
                }
              </h1>
              <p class="text-sm">Generado el ${fechaGeneracion}</p>
            </div>
            <div class="bg-blue-800 text-white px-3 py-1 rounded text-sm font-bold">
              ${estado.toUpperCase()}
            </div>
          </div>
        </div>

        <!-- Contenido principal en 2 columnas -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <!-- Columna izquierda -->
          <div>
            <div class="mb-6">
              <h2 class="section-title font-bold text-blue-800">INFORMACIÓN BÁSICA</h2>
              <div class="text-sm">
                <p><span class="font-semibold">Fecha Solicitud:</span> ${fechaMostrar}</p>
                <p><span class="font-semibold">Fecha Pago:</span> ${fechaPagoMostrar}</p>
                <p><span class="font-semibold">Solicitado por:</span> ${solicitadoPor}</p>
                <p><span class="font-semibold">Autorizado por:</span> ${autorizadoPor}</p>
                <p><span class="font-semibold">Aprobado por:</span> ${aprobadoPor}</p>
              </div>
            </div>

            ${gastoInfo || ""}
            ${proveedorInfo || ""}
            ${observacionesHtml || ""}
          </div>

          <!-- Columna derecha -->
          <div>
            <div class="mb-6">
              <h2 class="section-title font-bold text-blue-800">DATOS DE PAGO</h2>
              <div class="text-sm">
                <p><span class="font-semibold">Método:</span> ${metodoPago}</p>
                ${
                  metodoPago?.toUpperCase() === "TRANSFERENCIA"
                    ? `<p><span class="font-semibold">Banco:</span> ${banco}</p>
                     <p><span class="font-semibold">Referencia:</span> ${referencia}</p>`
                    : ""
                }
                <p><span class="font-semibold">Comprobante:</span> ${comprobanteLink}</p>
              </div>
            </div>

            <div>
              <h2 class="section-title font-bold text-blue-800">DETALLE DE MONTOS</h2>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="bg-gray-100">
                    <th class="text-left py-2 px-3 border">Concepto</th>
                    <th class="text-right py-2 px-3 border">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="py-2 px-3 border">Moneda</td>
                    <td class="py-2 px-3 border amount-value">${moneda}</td>
                  </tr>
                  <tr>
                    <td class="py-2 px-3 border">Tasa de Cambio</td>
                    <td class="py-2 px-3 border amount-value">${
                      tasaCambio !== null ? tasaCambio : "N/A"
                    }</td>
                  </tr>
                  <tr>
                    <td class="py-2 px-3 border">Monto Solicitado</td>
                    <td class="py-2 px-3 border amount-value font-semibold">$${parseFloat(
                      montoSolicitado
                    ).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-2 px-3 border">Monto Pagado</td>
                    <td class="py-2 px-3 border amount-value">$${parseFloat(
                      montoPagado
                    ).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="py-2 px-3 border font-semibold">Diferencia</td>
                    <td class="py-2 px-3 border amount-value font-semibold ${
                      diferencia === 0 ? "text-green-600" : "text-red-600"
                    }">
                      $${parseFloat(diferencia).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Firmas -->
        <div class="mt-8 pt-4 border-t">
          <h2 class="section-title font-bold text-center text-blue-800">FIRMAS AUTORIZADAS</h2>
          <div class="grid grid-cols-3 gap-4 text-center mt-4">
            <div>
              ${
                firmaSolicita
                  ? `<img src="${firmaSolicita}" class="h-16 mx-auto mb-2" />`
                  : '<div class="signature-placeholder"></div>'
              }
              <p class="font-semibold text-sm">${solicitadoPor}</p>
              <p class="text-gray-600 text-xs">Solicitado por</p>
            </div>
            <div>
              ${
                firmaAutoriza
                  ? `<img src="${firmaAutoriza}" class="h-16 mx-auto mb-2" />`
                  : '<div class="signature-placeholder"></div>'
              }
              <p class="font-semibold text-sm">${autorizadoPor}</p>
              <p class="text-gray-600 text-xs">Autorizado por</p>
            </div>
            <div>
              ${
                firmaAprueba
                  ? `<img src="${firmaAprueba}" class="h-16 mx-auto mb-2" />`
                  : '<div class="signature-placeholder"></div>'
              }
              <p class="font-semibold text-sm">${aprobadoPor}</p>
              <p class="text-gray-600 text-xs">Aprobado por</p>
            </div>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}
