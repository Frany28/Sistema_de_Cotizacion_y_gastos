export function generarHTMLOrdenPago(datos = {}, modo = "preview") {
  const {
    codigo = "N/A",
    estado = "N/A",
    fechaSolicitud = null,
    fechaPago = null,
    solicitadoPor = "N/A",
    autorizadoPor = "N/A",
    aprobadoPor = "N/A",
    firmaSolicita = null,
    firmaAutoriza = null,
    firmaAprueba = null,
    metodoPago = "N/A",
    banco = "N/A",
    referencia = "N/A",
    montoSolicitado = 0,
    montoPagado = 0,
    diferencia = 0,
    moneda = "USD",
    tasaCambio = null,
    observaciones = "",
    gasto = {},
    proveedor = null,
    comprobanteUrl = null,
    createdAt = null,
    updatedAt = null,
    logo = null,
  } = datos;

  function formatoMoneda(valor = 0) {
    const numero = Number(valor);
    if (isNaN(numero)) return "N/A";

    const formato = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);

    if (String(moneda).toUpperCase() === "VES") return `${formato} Bs`;
    return `$ ${formato}`;
  }

  /** === Fechas (Zona: Venezuela) === */
  const timeZoneVzla = "America/Caracas";

  function formatearFechaVzlaSoloFecha(valorFecha, opciones = {}) {
    if (!valorFecha) return null;

    const fecha = new Date(valorFecha);
    if (isNaN(fecha.getTime())) return null;

    return fecha.toLocaleDateString("es-VE", {
      timeZone: timeZoneVzla,
      ...opciones,
    });
  }

  const fechaMostrar = fechaSolicitud
    ? formatearFechaVzlaSoloFecha(fechaSolicitud)
    : "Sin especificar";

  const fechaPagoMostrar = fechaPago
    ? formatearFechaVzlaSoloFecha(fechaPago)
    : "—";

  const fechaGeneracion =
    formatearFechaVzlaSoloFecha(createdAt || Date.now(), {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) || "Sin especificar";

  /** === Datos del gasto === */
  const {
    codigo: codigoGasto = "—",
    tipoGasto = "—",
    total: totalGasto = 0,
    moneda: monedaGasto = "—",
    tasaCambio: tasaCambioGasto = null,
    documentoUrl: documentoGastoUrl = null,
  } = gasto || {};

  const isBolivares = String(moneda).toUpperCase() === "VES";

  const estiloFirma = (firmaDataUrl) => {
    if (!firmaDataUrl) return "";
    return `
      <div class="firmaBox">
        <img class="firmaImg" src="${firmaDataUrl}" alt="Firma" />
      </div>
    `;
  };

  const seccionProveedor = proveedor
    ? `
      <div class="card">
        <div class="cardTitle">Proveedor</div>
        <div class="grid2">
          <div><span class="label">Nombre:</span> ${
            proveedor?.nombre || "—"
          }</div>
          <div><span class="label">RIF:</span> ${proveedor?.rif || "—"}</div>
          <div><span class="label">Teléfono:</span> ${
            proveedor?.telefono || "—"
          }</div>
          <div><span class="label">Email:</span> ${
            proveedor?.email || "—"
          }</div>
        </div>
      </div>
    `
    : "";

  const seccionAdjuntos = `
    <div class="card">
      <div class="cardTitle">Adjuntos</div>
      <div class="grid2">
        <div>
          <span class="label">Comprobante:</span>
          ${
            comprobanteUrl
              ? `<a class="link" href="${comprobanteUrl}" target="_blank" rel="noreferrer">Ver comprobante</a>`
              : "—"
          }
        </div>
        <div>
          <span class="label">Documento del gasto:</span>
          ${
            documentoGastoUrl
              ? `<a class="link" href="${documentoGastoUrl}" target="_blank" rel="noreferrer">Ver documento</a>`
              : "—"
          }
        </div>
      </div>
      <div class="note">
        Nota: Los enlaces pueden expirar si son URLs prefirmadas (S3). Si ocurre, vuelva a abrir desde el sistema.
      </div>
    </div>
  `;

  const badgeEstado = () => {
    const estadoLower = String(estado).toLowerCase().trim();

    if (estadoLower === "pagada")
      return `<span class="badge badgeGreen">Pagada</span>`;
    if (estadoLower.includes("parcial"))
      return `<span class="badge badgeBlue">Parcialmente pagada</span>`;
    if (estadoLower.includes("cancel"))
      return `<span class="badge badgeRed">Cancelada</span>`;
    return `<span class="badge badgeYellow">${estado || "N/A"}</span>`;
  };

  const mostrarTasa = isBolivares && tasaCambio ? `${tasaCambio} Bs` : "—";

  const tituloDocumento =
    modo === "final"
      ? "Comprobante / Orden de Pago"
      : "Vista previa de Orden de Pago";

  const subTitulo =
    modo === "final"
      ? `Generado el ${fechaGeneracion}`
      : `Vista previa (no válido como comprobante) - ${fechaGeneracion}`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Orden de Pago - ${codigo}</title>
  <style>
    :root{
      --bg:#0b1220;
      --card:#0f1a2e;
      --border:#1e2a44;
      --text:#e5e7eb;
      --muted:#9ca3af;
      --accent:#60a5fa;
      --green:#34d399;
      --blue:#60a5fa;
      --red:#f87171;
      --yellow:#fbbf24;
      --white:#ffffff;
    }
    *{box-sizing:border-box;}
    body{
      font-family: Arial, Helvetica, sans-serif;
      margin:0;
      padding:24px;
      background:#ffffff;
      color:#111827;
    }
    .page{
      width:100%;
      max-width:1000px;
      margin:0 auto;
    }
    .header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:16px;
      border:1px solid #e5e7eb;
      padding:16px;
      border-radius:12px;
    }
    .brand{
      display:flex;
      gap:12px;
      align-items:center;
    }
    .logo{
      width:56px;
      height:56px;
      object-fit:contain;
      border-radius:10px;
      border:1px solid #e5e7eb;
      padding:6px;
    }
    .hTitle{
      margin:0;
      font-size:18px;
      font-weight:700;
      color:#111827;
    }
    .hSub{
      margin:4px 0 0 0;
      font-size:12px;
      color:#6b7280;
    }
    .metaRight{
      text-align:right;
      min-width:220px;
    }
    .metaRight .code{
      font-size:12px;
      color:#6b7280;
    }
    .metaRight .code strong{
      color:#111827;
    }
    .badge{
      display:inline-block;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      margin-top:8px;
    }
    .badgeGreen{ background:#ecfdf5; color:#065f46; }
    .badgeBlue{ background:#eff6ff; color:#1d4ed8; }
    .badgeRed{ background:#fef2f2; color:#991b1b; }
    .badgeYellow{ background:#fffbeb; color:#92400e; }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:14px;
      margin-top:14px;
    }
    .card{
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:14px;
    }
    .cardTitle{
      font-size:13px;
      font-weight:700;
      margin-bottom:10px;
      color:#111827;
    }
    .grid2{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:10px;
      font-size:12px;
      color:#111827;
    }
    .label{
      color:#6b7280;
      font-weight:700;
    }
    .table{
      width:100%;
      border-collapse:collapse;
      overflow:hidden;
      border-radius:12px;
      border:1px solid #e5e7eb;
      margin-top:14px;
    }
    .table th, .table td{
      padding:10px 12px;
      font-size:12px;
      border-bottom:1px solid #e5e7eb;
      text-align:left;
      vertical-align:top;
    }
    .table thead th{
      background:#f9fafb;
      font-weight:800;
      color:#111827;
    }
    .table .right{
      text-align:right;
      font-weight:700;
    }
    .resume{
      margin-top:14px;
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:14px;
      display:flex;
      justify-content:flex-end;
    }
    .resumeBox{
      width:320px;
      font-size:12px;
    }
    .resumeRow{
      display:flex;
      justify-content:space-between;
      padding:6px 0;
      border-bottom:1px dashed #e5e7eb;
    }
    .resumeRow:last-child{
      border-bottom:none;
      padding-top:10px;
      font-size:13px;
      font-weight:900;
    }
    .muted{ color:#6b7280; }
    .link{ color:#2563eb; text-decoration:underline; }
    .note{
      margin-top:10px;
      font-size:11px;
      color:#6b7280;
      line-height:1.35;
    }
    .firmas{
      display:grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap:14px;
      margin-top:14px;
    }
    .firmaCard{
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:12px;
      text-align:center;
      min-height:110px;
    }
    .firmaTitulo{
      font-size:12px;
      font-weight:800;
      color:#111827;
      margin:0 0 8px 0;
    }
    .firmaBox{
      width:100%;
      display:flex;
      justify-content:center;
      align-items:center;
      min-height:60px;
    }
    .firmaImg{
      max-width: 220px;
      max-height: 60px;
      object-fit:contain;
    }
    .firmaNombre{
      margin-top:8px;
      font-size:11px;
      color:#6b7280;
    }
    .footer{
      margin-top:16px;
      font-size:11px;
      color:#6b7280;
      text-align:center;
    }

    @media print{
      body{ padding:0; }
      .page{ max-width:100%; }
      .link{ text-decoration:none; color:#111827; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        ${
          logo
            ? `<img class="logo" src="${logo}" alt="Logo" />`
            : `<div class="logo" style="display:flex;align-items:center;justify-content:center;font-weight:900;color:#111827;">LOGO</div>`
        }
        <div>
          <h1 class="hTitle">${tituloDocumento}</h1>
          <p class="hSub">${subTitulo}</p>
        </div>
      </div>

      <div class="metaRight">
        <div class="code">Código: <strong>${codigo}</strong></div>
        ${badgeEstado()}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="cardTitle">Información de la solicitud</div>
        <div class="grid2">
          <div><span class="label">Fecha solicitud:</span> ${fechaMostrar}</div>
          <div><span class="label">Fecha pago:</span> ${fechaPagoMostrar}</div>
          <div><span class="label">Estado:</span> ${estado || "N/A"}</div>
          <div><span class="label">Tasa de cambio:</span> ${mostrarTasa}</div>
        </div>
      </div>

      <div class="card">
        <div class="cardTitle">Responsables</div>
        <div class="grid2">
          <div><span class="label">Solicitado por:</span> ${
            solicitadoPor || "—"
          }</div>
          <div><span class="label">Autorizado por:</span> ${
            autorizadoPor || "—"
          }</div>
          <div><span class="label">Aprobado por:</span> ${
            aprobadoPor || "—"
          }</div>
          <div><span class="label">Método:</span> ${metodoPago || "—"}</div>
          <div><span class="label">Banco:</span> ${banco || "—"}</div>
          <div><span class="label">Referencia:</span> ${referencia || "—"}</div>
        </div>
      </div>
    </div>

    ${seccionProveedor}

    <table class="table">
      <thead>
        <tr>
          <th>Concepto / Gasto</th>
          <th>Tipo</th>
          <th class="right">Monto solicitado</th>
          <th class="right">Monto pagado</th>
          <th class="right">Diferencia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><span class="label">Código gasto:</span> ${codigoGasto}</div>
            <div><span class="label">Obs:</span> ${observaciones || "—"}</div>
          </td>
          <td>${tipoGasto || tipoGasto}</td>
          <td class="right">${formatoMoneda(montoSolicitado)}</td>
          <td class="right">${formatoMoneda(montoPagado)}</td>
          <td class="right">${formatoMoneda(diferencia)}</td>
        </tr>
        <tr>
          <td colspan="2"><span class="label">Total del gasto:</span></td>
          <td colspan="3" class="right">
            ${
              String(monedaGasto).toUpperCase() === "VES"
                ? `${new Intl.NumberFormat("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(totalGasto) || 0)} Bs`
                : `$ ${new Intl.NumberFormat("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Number(totalGasto) || 0)}`
            }
            ${
              tasaCambioGasto
                ? `<span class="muted"> (tasa: ${tasaCambioGasto} Bs)</span>`
                : ""
            }
          </td>
        </tr>
      </tbody>
    </table>

    <div class="resume">
      <div class="resumeBox">
        <div class="resumeRow">
          <span class="muted">Monto solicitado:</span>
          <span>${formatoMoneda(montoSolicitado)}</span>
        </div>
        <div class="resumeRow">
          <span class="muted">Monto pagado:</span>
          <span>${formatoMoneda(montoPagado)}</span>
        </div>
        <div class="resumeRow">
          <span class="muted">Diferencia:</span>
          <span>${formatoMoneda(diferencia)}</span>
        </div>
      </div>
    </div>

    ${seccionAdjuntos}

    <div class="firmas">
      <div class="firmaCard">
        <p class="firmaTitulo">Solicita</p>
        ${estiloFirma(firmaSolicita)}
        <div class="firmaNombre">${solicitadoPor || "—"}</div>
      </div>

      <div class="firmaCard">
        <p class="firmaTitulo">Autoriza</p>
        ${estiloFirma(firmaAutoriza)}
        <div class="firmaNombre">${autorizadoPor || "—"}</div>
      </div>

      <div class="firmaCard">
        <p class="firmaTitulo">Aprueba</p>
        ${estiloFirma(firmaAprueba)}
        <div class="firmaNombre">${aprobadoPor || "—"}</div>
      </div>
    </div>

   
  </div>
</body>
</html>
`;
}
