// templates/generarHTMLEventosArchivos.js
// Versión sin dependencias externas (sin Tailwind). Estilos inline para PDF.
// Mantiene compatibilidad: periodoLabel/fechaInicioTexto/fechaFinTexto o (fechaInicio/fechaFin).

function escaparHtml(texto) {
  if (texto == null) return "";
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function generarHTMLEventosArchivos({
  usuario = "admin",
  periodoLabel,
  fechaInicioTexto,
  fechaFinTexto,

  // compat. legacy
  fechaInicio,
  fechaFin,

  totales = { subidos: 0, reemplazados: 0, eliminados: 0, borrados: 0 },
  detalleMovimientos = [],

  logoUrl = null,
  tituloReporte = "REPORTE DE MOVIMIENTOS DE ARCHIVOS",
  subtituloReporte = null, // opcional

  mostrarGrafico = true,
  mostrarDetalle = true,
  mostrarMarcaAgua = true,

  // paleta
  colorTexto = "#111111",
  colorSec = "#555555",
  colorBorde = "#d1d5db",
  colorEncabezado = "#1f2937",
  colorFondoClaro = "#f8fafc",

  estilosPersonalizados = "",
} = {}) {
  // Texto del período
  const periodoLegible = periodoLabel
    ? `${escaparHtml(periodoLabel)}${
        fechaInicioTexto && fechaFinTexto
          ? ` · ${escaparHtml(fechaInicioTexto)} a ${escaparHtml(
              fechaFinTexto
            )}`
          : ""
      }`
    : fechaInicio && fechaFin
    ? `Movimientos entre ${escaparHtml(fechaInicio)} y ${escaparHtml(fechaFin)}`
    : "Período no especificado";

  const sinMovs = !detalleMovimientos || detalleMovimientos.length === 0;

  // Barras SVG
  const vals = [
    { etiqueta: "Subidos", valor: Number(totales.subidos || 0) },
    { etiqueta: "Reemplaz.", valor: Number(totales.reemplazados || 0) },
    { etiqueta: "Eliminados", valor: Number(totales.eliminados || 0) },
    { etiqueta: "Borrados", valor: Number(totales.borrados || 0) },
  ];
  const maxV = Math.max(1, ...vals.map((v) => v.valor));
  const barrasSvg = vals
    .map((v, i) => {
      const w = 48,
        gap = 24,
        baseX = 36,
        baseY = 160,
        hMax = 110;
      const x = baseX + i * (w + gap);
      const h = (v.valor / maxV) * hMax;
      const y = baseY - h;
      return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#9ca3af" />
      <text x="${x + w / 2}" y="${
        baseY + 16
      }" font-size="11" text-anchor="middle" fill="${colorSec}">${escaparHtml(
        v.etiqueta
      )}</text>
      <text x="${x + w / 2}" y="${
        y - 6
      }" font-size="12" text-anchor="middle" fill="${colorTexto}">${
        v.valor
      }</text>
    `;
    })
    .join("");

  // Filas del detalle
  const filas = (detalleMovimientos || [])
    .map(
      (r) => `
    <tr class="tr">
      <td class="td">${escaparHtml(r.fecha || "")}</td>
      <td class="td">${escaparHtml(r.hora || "")}</td>
      <td class="td">${escaparHtml(r.usuario || "")}</td>
      <td class="td">${escaparHtml(r.tipoAccion || "")}</td>
      <td class="td">${escaparHtml(r.archivo || "")}</td>
      <td class="td">${escaparHtml(r.observaciones || "")}</td>
    </tr>
  `
    )
    .join("");

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escaparHtml(tituloReporte)}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Noto Sans", sans-serif;
      color: ${colorTexto};
      font-size: 12px;
    }
    .row { display: flex; align-items: center; justify-content: space-between; }
    .mt-4 { margin-top: 16px; } .mb-2 { margin-bottom: 8px; } .mb-4 { margin-bottom: 16px; } .mb-6 { margin-bottom: 24px; }
    .logo {
      width: 36px; height: 36px; border: 1px solid ${colorBorde}; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center; font-size: 10px;
    }
    .title { font-size: 22px; font-weight: 800; letter-spacing: .2px; }
    .subtitle { color: ${colorSec}; margin-top: 4px; }
    .right { text-align: right; color: ${colorSec}; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .card { border: 1px solid ${colorBorde}; border-radius: 8px; padding: 12px; }
    .card-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: ${colorEncabezado}; }
    .cuadro { width: 100%; border: 1px solid ${colorBorde}; border-collapse: collapse; }
    .cuadro td, .cuadro th { border: 1px solid ${colorBorde}; padding: 10px 12px; vertical-align: top; }
    .cuadro .label { color: ${colorSec}; font-size: 11px; }
    .cuadro .num { font-size: 20px; font-weight: 800; }
    .graf { width: 100%; height: 200px; border: 1px solid ${colorBorde}; border-radius: 6px; padding: 6px; }
    .h2 { font-weight: 800; font-size: 14px; color: ${colorEncabezado}; margin-bottom: 8px; }
    table.det { width: 100%; border-collapse: collapse; }
    table.det th {
      text-align: left; background: ${colorEncabezado}; color: #fff;
      padding: 8px 10px; font-size: 12px;
    }
    table.det td { padding: 8px 10px; border-bottom: 1px solid ${colorBorde}; }
    .water {
      position: absolute; inset: 0; display: ${
        sinMovs && mostrarMarcaAgua ? "flex" : "none"
      };
      align-items: center; justify-content: center; opacity: .1; font-weight: 800; font-size: 120px; color: ${colorSec};
      transform: rotate(-18deg); pointer-events: none;
    }
    .chip { display:inline-block; padding:2px 6px; border:1px solid ${colorBorde}; border-radius:4px; background:${colorFondoClaro}; color:${colorSec}; font-size:11px; }
    footer { margin-top: 14px; text-align:center; color:${colorSec}; font-size:11px; }
    ${estilosPersonalizados || ""}
  </style>
</head>
<body>
  <div class="water">SIN MOVIMIENTOS</div>

  <!-- Encabezado -->
  <div class="row mb-6">
    <div class="row" style="gap:10px;">
      ${
        logoUrl
          ? `<img src="${escaparHtml(
              logoUrl
            )}" alt="logo" style="width:38px;height:38px;object-fit:contain;border:1px solid ${colorBorde};border-radius:50%;" />`
          : `<div class="logo">LOGO</div>`
      }
      <div>
        <div class="title">${escaparHtml(tituloReporte)}</div>
        <div class="subtitle">${
          // Si viene periodoLabel, mostramos “periodoLabel · fechaInicio a fechaFin”.
          // Si no, formato legacy “Movimientos entre … y …”
          periodoLegible.includes("Movimientos entre")
            ? escaparHtml(periodoLegible)
            : `Movimientos entre ${escaparHtml(
                fechaInicioTexto || fechaInicio || "-"
              )} y ${escaparHtml(fechaFinTexto || fechaFin || "-")}`
        }</div>
        ${
          subtituloReporte
            ? `<div class="subtitle">${escaparHtml(subtituloReporte)}</div>`
            : ""
        }
      </div>
    </div>
    <div class="right">
      <div>Usuario: ${escaparHtml(usuario)}</div>
      <div>Generado: ${escaparHtml(new Date().toLocaleString("es-VE"))}</div>
    </div>
  </div>

  <!-- Resumen + Gráfico -->
  <div class="grid mb-6">
    <div class="card">
      <div class="h2">RESUMEN GENERAL</div>
      <table class="cuadro">
        <tr>
          <td>
            <div class="label">Total de archivos subidos</div>
            <div class="num">${Number(totales.subidos || 0)}</div>
          </td>
          <td>
            <div class="label">Total de archivos reemplazados</div>
            <div class="num">${Number(totales.reemplazados || 0)}</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="label">Total de archivos eliminados</div>
            <div class="num">${Number(totales.eliminados || 0)}</div>
          </td>
          <td>
            <div class="label">Total de archivos borrados</div>
            <div class="num">${Number(totales.borrados || 0)}</div>
          </td>
        </tr>
      </table>
    </div>

    ${
      mostrarGrafico
        ? `<div class="card">
             <div class="h2">Distribución de acciones</div>
             <div class="graf">
               <svg width="100%" height="188" viewBox="0 0 360 188" xmlns="http://www.w3.org/2000/svg">
                 <rect x="28" y="24" width="304" height="136" fill="#ffffff" stroke="${colorBorde}"/>
                 ${barrasSvg}
                 <line x1="28" y1="160" x2="332" y2="160" stroke="#cbd5e1" />
                 <g font-size="11" fill="${colorSec}">
                   <text x="4" y="34">25</text>
                 </g>
               </svg>
             </div>
           </div>`
        : `<div></div>`
    }
  </div>

  <!-- Detalle -->
  ${
    mostrarDetalle
      ? `<div class="mb-4">
           <div class="h2">DETALLE POR MOVIMIENTO</div>
           ${
             sinMovs
               ? `<div class="card" style="background:${colorFondoClaro}; color:${colorSec};">No se registraron movimientos en el período seleccionado.</div>`
               : `<table class="det">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Usuario</th>
                        <th>Tipo de acción</th>
                        <th>Archivo</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filas}
                    </tbody>
                  </table>`
           }
         </div>`
      : ``
  }

  <footer>Sistema de Cotización y Gastos · Reporte generado automáticamente</footer>
</body>
</html>`;
}
