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
    montoAbono = 0,
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
    updatedAt = null,
    // 🔹 NUEVO: logo en base64 (data URL)
    logo = null,

    // ✅ NUEVO: datos del pago (si existe)
    pagoRealizado = null,
  } = datos;

  /* ==========================
     ✅ Normalización de datos de pago
     - Si viene pagoRealizado, manda él.
     - Si no viene, usa los campos anteriores.
  ========================== */
  const metodoPagoFinal =
    pagoRealizado?.metodoPago ?? pagoRealizado?.metodo ?? metodoPago ?? "N/A";

  const bancoFinal =
    pagoRealizado?.bancoNombre ?? pagoRealizado?.banco ?? banco ?? "—";

  const cuentaBancariaFinal =
    pagoRealizado?.numeroCuenta ??
    pagoRealizado?.cuentaBancaria ??
    pagoRealizado?.cuenta ??
    "—";

  const referenciaFinal =
    pagoRealizado?.referenciaPago ??
    pagoRealizado?.referencia ??
    referencia ??
    "—";

  const comprobanteUrlFinal =
    pagoRealizado?.rutaComprobante ??
    pagoRealizado?.comprobanteUrl ??
    comprobanteUrl ??
    null;

  const fechaPagoFinal = pagoRealizado?.fechaPago ?? fechaPago ?? null;

  /* === FUNCIÓN FORMATO LATAM === */
  function formatearLatam(valor, monedaLabel) {
    if (valor === null || valor === undefined || valor === "N/A") return "N/A";

    const numero = Number(valor);
    if (isNaN(numero)) return "N/A";

    const formato = numero.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (!monedaLabel) return formato;

    return monedaLabel === "VES" ? `Bs ${formato}` : `$ ${formato}`;
  }

  /* === Fechas === */
  const fechaMostrar = fechaSolicitud
    ? new Date(fechaSolicitud).toLocaleDateString("es-VE")
    : "Sin especificar";

  const fechaPagoMostrar = fechaPagoFinal
    ? new Date(fechaPagoFinal).toLocaleDateString("es-VE")
    : "—";

  const fechaGeneracion = new Date(createdAt || Date.now()).toLocaleDateString(
    "es-VE",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  /* === Gasto asociado === */
  const gastoInfo =
    gasto && Object.keys(gasto).length > 0
      ? `
      <div class="bg-gray-50 p-3 rounded border mb-4">
        <h3 class="font-bold text-sm mb-2 text-blue-800">GASTO ASOCIADO</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <p><span class="font-semibold">Código:</span> ${
            gasto.codigo || "—"
          }</p>
          <p><span class="font-semibold">Tipo:</span> ${
            gasto.tipoGasto || "—"
          }</p>
          <p><span class="font-semibold">Total:</span> ${formatearLatam(
            gasto.total || 0,
            gasto.moneda === "VES" ? "VES" : "USD"
          )}</p>
          <p><span class="font-semibold">Tasa Cambio:</span> ${
            tasaCambio !== null ? formatearLatam(tasaCambio, null) : "N/A"
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

  /* === Proveedor === */
  const proveedorInfo = proveedor
    ? `
      <div class="bg-gray-50 p-3 rounded border mb-4">
        <h3 class="font-bold text-sm mb-2 text-blue-800">PROVEEDOR</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <p><span class="font-semibold">Nombre:</span> ${proveedor.nombre}</p>
          <p><span class="font-semibold">RIF:</span> ${proveedor.rif}</p>
          <p><span class="font-semibold">Teléfono:</span> ${
            proveedor.telefono || "—"
          }</p>
          <p><span class="font-semibold">Email:</span> ${
            proveedor.email || "—"
          }</p>
        </div>
      </div>
    `
    : "";

  /* === Observaciones === */
  const observacionesHtml = observaciones
    ? `
      <div class="mb-4 p-3 bg-gray-50 rounded border">
        <h3 class="font-bold text-sm mb-1 text-blue-800">OBSERVACIONES</h3>
        <p class="text-xs">${observaciones}</p>
      </div>
    `
    : "";

  /* === Comprobante === */
  const comprobanteLink = comprobanteUrlFinal
    ? `<a href="${comprobanteUrlFinal}" target="_blank" class="text-blue-600 underline">Ver comprobante</a>`
    : "—";

  /* === Logo (si existe) === */
  const logoHtml = logo
    ? `<img src="${logo}" class="h-12 object-contain" />`
    : "";

  /* === HTML === */
  return `
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <script src="https://cdn.tailwindcss.com"></script>
      <title>Orden de Pago</title>
      <style>
        @page {
          size: A4;
          margin: 1cm;
        }
        body {
          font-family: 'Helvetica', Arial, sans-serif;
        }
        .header-accent {
          border-left: 4px solid #1e40af;
        }
        .amount-cell {
          text-align: right;
          padding-right: 1rem;
        }
        .firma-placeholder {
          height: 60px;
          border-bottom: 1px dashed #ccc;
          margin-top: 10px;
        }
      </style>
    </head>
    <body class="bg-white p-6 text-gray-800 text-xs">
      <div class="max-w-4xl mx-auto border rounded-lg overflow-hidden">

        <!-- ENCABEZADO CON LOGO A UN LADO -->
        <div class="bg-blue-800 text-white p-4">
          <div class="flex justify-between items-center gap-4">
            <div class="flex items-center gap-4">
              ${logoHtml}
              <div class="header-accent pl-3">
                ${
                  modo === "final"
                    ? `<h1 class="text-xl font-bold">ORDEN DE PAGO #${codigo}</h1>`
                    : `<h1 class="text-xl font-bold">BORRADOR DE ORDEN DE PAGO</h1>`
                }
                <p class="text-xs opacity-90">Generado el ${fechaGeneracion}</p>
              </div>
            </div>
            <div class="bg-white text-blue-800 px-3 py-1 rounded text-xs font-bold">
              ${estado.toUpperCase()}
            </div>
          </div>
        </div>

        <!-- Datos principales -->
        <div class="grid grid-cols-2 gap-4 p-4 border-b">
          <div>
            <h2 class="font-bold text-sm mb-2 text-blue-800">INFORMACIÓN BÁSICA</h2>
            <div class="space-y-1 text-xs">
              <p><span class="font-semibold">Fecha Solicitud:</span> ${fechaMostrar}</p>
              <p><span class="font-semibold">Fecha Pago:</span> ${fechaPagoMostrar}</p>
              <p><span class="font-semibold">Solicitado por:</span> ${solicitadoPor}</p>
              <p><span class="font-semibold">Autorizado por:</span> ${autorizadoPor}</p>
              <p><span class="font-semibold">Aprobado por:</span> ${aprobadoPor}</p>
            </div>
          </div>
          
          <div>
            <h2 class="font-bold text-sm mb-2 text-blue-800">DATOS DE PAGO</h2>
            <div class="space-y-1 text-xs">
              <p><span class="font-semibold">Método:</span> ${metodoPagoFinal}</p>
              ${
                metodoPagoFinal?.toUpperCase() === "TRANSFERENCIA"
                  ? `<p><span class="font-semibold">Banco:</span> ${bancoFinal}</p>
                     <p><span class="font-semibold">Cuenta:</span> ${cuentaBancariaFinal}</p>
                     <p><span class="font-semibold">Referencia:</span> ${referenciaFinal}</p>`
                  : ""
              }
              <p><span class="font-semibold">Comprobante:</span> ${comprobanteLink}</p>
            </div>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="p-4 border-b">
          ${gastoInfo || ""}
          ${proveedorInfo || ""}
          ${observacionesHtml || ""}
        </div>

        <!-- Tabla de montos -->
        <div class="p-4 border-b">
          <h2 class="font-bold text-sm mb-2 text-blue-800">DETALLE DE MONTOS</h2>
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr class="bg-gray-100">
                <th class="text-left py-2 px-3 border">Concepto</th>
                <th class="text-right py-2 px-3 border">Valor</th>
              </tr>
            </thead>
            <tbody>
             <tr>
                <td class="py-1 px-3 border">Monto Solicitado</td>
                <td class="py-1 px-3 border amount-cell font-semibold">${formatearLatam(
                  montoSolicitado,
                  moneda === "VES" ? "VES" : "USD"
                )}</td>
              </tr>
               <tr>
                <td class="py-1 px-3 border">Monto de este pago</td>
                <td class="py-1 px-3 border amount-cell font-semibold text-blue-700">
                  ${formatearLatam(
                    montoAbono,
                    moneda === "VES" ? "VES" : "USD"
                  )}
                </td>
              </tr>
              <tr>
                <td class="py-1 px-3 border font-semibold">Saldo pendiente</td>
                <td class="py-1 px-3 border amount-cell font-semibold ${
                  diferencia === 0 ? "text-green-600" : "text-red-600"
                }">
                  ${formatearLatam(
                    diferencia,
                    moneda === "VES" ? "VES" : "USD"
                  )}
                </td>
              </tr>
              <tr>
                <td class="py-1 px-3 border">Moneda</td>
                <td class="py-1 px-3 border amount-cell">${moneda}</td>
              </tr>
              <tr>
                <td class="py-1 px-3 border">Tasa de Cambio</td>
                <td class="py-1 px-3 border amount-cell">${formatearLatam(
                  tasaCambio,
                  null
                )}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Firmas -->
        <div class="p-4">
          <h3 class="font-bold text-sm mb-3 text-center text-blue-800">FIRMAS AUTORIZADAS</h3>
          <div class="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              ${
                firmaSolicita
                  ? `<img src="${firmaSolicita}" class="h-12 mx-auto mb-1" />`
                  : '<div class="firma-placeholder"></div>'
              }
              <p class="font-semibold">${solicitadoPor}</p>
              <p class="text-gray-500">Solicitado por</p>
            </div>
            <div>
              ${
                firmaAutoriza
                  ? `<img src="${firmaAutoriza}" class="h-12 mx-auto mb-1" />`
                  : '<div class="firma-placeholder"></div>'
              }
              <p class="font-semibold">${autorizadoPor}</p>
              <p class="text-gray-500">Autorizado por</p>
            </div>
            <div>
              ${
                firmaAprueba
                  ? `<img src="${firmaAprueba}" class="h-12 mx-auto mb-1" />`
                  : '<div class="firma-placeholder"></div>'
              }
              <p class="font-semibold">${aprobadoPor}</p>
              <p class="text-gray-500">Aprobado por</p>
            </div>
          </div>
        </div>

        <!-- Pie de página -->
        <div class="bg-gray-100 p-2 text-center text-xs text-gray-500">
          Documento generado el ${fechaGeneracion}
        </div>
      </div>
    </body>
    </html>
  `;
}
