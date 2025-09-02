// templates/generarHTMLEventosArchivos.js

function escaparHtml(texto) {
  if (texto == null) return "";
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Genera el HTML del reporte (A4) copiando el diseño de la maqueta.
 * @param {Object} opciones
 * @param {string} opciones.usuario
 * @param {string} opciones.fechaInicioTexto  - en formato dd/mm/yyyy
 * @param {string} opciones.fechaFinTexto     - en formato dd/mm/yyyy
 * @param {Object} opciones.totales           - { subidos, reemplazados, eliminados, borrados }
 * @param {Array}  opciones.detalleMovimientos - [{fecha, hora, usuario, tipoAccion, archivo, observaciones}]
 * @param {string|null} opciones.logoUrl
 * @param {boolean} [opciones.mostrarGrafico=true]
 * @param {boolean} [opciones.mostrarDetalle=true]
 * @param {string}  [opciones.tituloReporte="REPORTE DE MOVIMIENTOS DE ARCHIVOS"]
 */
export function generarHTMLEventosArchivos({
  usuario = "admin",
  fechaInicioTexto = "",
  fechaFinTexto = "",
  totales = { subidos: 0, reemplazados: 0, eliminados: 0, borrados: 0 },
  detalleMovimientos = [],
  logoUrl = null,
  mostrarGrafico = true,
  mostrarDetalle = true,
  tituloReporte = "REPORTE DE MOVIMIENTOS DE ARCHIVOS",
} = {}) {
  const periodoLegible = `Movimientos entre ${escaparHtml(
    fechaInicioTexto || "-"
  )} y ${escaparHtml(fechaFinTexto || "-")}`;

  // --- Datos gráfica (coinciden con tarjetas de la maqueta)
  const barras = [
    { etiqueta: "Subidos", valor: Number(totales.subidos || 0) },
    { etiqueta: "Reemplaz.", valor: Number(totales.reemplazados || 0) },
    { etiqueta: "Eliminados", valor: Number(totales.eliminados || 0) },
    { etiqueta: "Borrados", valor: Number(totales.borrados || 0) },
  ];
  const maxValor = Math.max(1, ...barras.map((b) => b.valor));

  const svgBarras = barras
    .map((b, i) => {
      const anchoBarra = 42;
      const gap = 26;
      const baseX = 36;
      const baseY = 170;
      const altoMax = 120;
      const x = baseX + i * (anchoBarra + gap);
      const alto = (b.valor / maxValor) * altoMax;
      const y = baseY - alto;
      return `
        <rect x="${x}" y="${y}" width="${anchoBarra}" height="${alto}" rx="6" fill="#9ca3af"/>
        <text x="${x + anchoBarra / 2}" y="${
        y - 6
      }" font-size="12" font-weight="700" text-anchor="middle" fill="#111827">${
        b.valor
      }</text>
        <text x="${x + anchoBarra / 2}" y="${
        baseY + 16
      }" font-size="11" text-anchor="middle" fill="#6b7280">${escaparHtml(
        b.etiqueta
      )}</text>
      `;
    })
    .join("");

  // --- Mapeo de acciones (ENUM oficial)
  const mapaAcciones = {
    subidaArchivo: "Subida",
    sustitucionArchivo: "Sustitución",
    eliminacionArchivo: "Eliminación",
    borradoDefinitivo: "Borrado definitivo",
  };

  const filasDetalle = (detalleMovimientos || [])
    .map((r) => {
      const accionLegible = mapaAcciones[r.tipoAccion] || r.tipoAccion || "";
      return `
        <tr class="border-b border-slate-200">
          <td class="px-3 py-2">${escaparHtml(r.fecha || "")}</td>
          <td class="px-3 py-2">${escaparHtml(r.hora || "")}</td>
          <td class="px-3 py-2">${escaparHtml(r.usuario || "")}</td>
          <td class="px-3 py-2">${escaparHtml(accionLegible)}</td>
          <td class="px-3 py-2 truncate">${escaparHtml(r.archivo || "")}</td>
          <td class="px-3 py-2">${escaparHtml(r.observaciones || "")}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escaparHtml(tituloReporte)}</title>
  <!-- Tailwind para maquetado fiel a la maqueta -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    html, body { height: 100%; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; color: #0f172a; }
    .tabla-detalle th { background:#f8fafc; }
  </style>
</head>
<body class="text-slate-900 text-[12px]">
  <!-- Encabezado -->
  <header class="flex items-start justify-between">
    <div class="flex items-center gap-3">
      ${
        logoUrl
          ? `<img src="${escaparHtml(
              logoUrl
            )}" alt="logo" class="w-10 h-10 object-contain rounded-full border border-slate-300">`
          : `<div class="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">LOGO</div>`
      }
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight leading-6">${escaparHtml(
          tituloReporte
        )}</h1>
        <p class="text-slate-600 mt-0.5">${periodoLegible}</p>
      </div>
    </div>
    <div class="text-right text-slate-600">
      <div><span class="text-slate-500">Usuario:</span> ${escaparHtml(
        usuario
      )}</div>
      <div><span class="text-slate-500">Generado:</span> ${escaparHtml(
        new Date().toLocaleString("es-VE")
      )}</div>
    </div>
  </header>

  <!-- Separador -->
  <div class="h-4"></div>

  <!-- RESUMEN + GRÁFICO -->
  <section class="grid grid-cols-2 gap-6">
    <!-- Resumen general (tabla 2x2) -->
    <div>
      <h2 class="text-[14px] font-extrabold text-slate-800 mb-2">RESUMEN GENERAL</h2>
      <div class="border border-slate-300 rounded-lg overflow-hidden">
        <div class="grid grid-cols-2 divide-x divide-slate-300">
          <div class="p-3 border-b border-slate-300">
            <div class="text-[11px] text-slate-600">Total de archivos subidos</div>
            <div class="text-[22px] font-extrabold leading-6">${Number(
              totales.subidos || 0
            )}</div>
          </div>
          <div class="p-3 border-b border-slate-300">
            <div class="text-[11px] text-slate-600">Total de archivos reemplazados</div>
            <div class="text-[22px] font-extrabold leading-6">${Number(
              totales.reemplazados || 0
            )}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 divide-x divide-slate-300">
          <div class="p-3">
            <div class="text-[11px] text-slate-600">Total de archivos eliminados</div>
            <div class="text-[22px] font-extrabold leading-6">${Number(
              totales.eliminados || 0
            )}</div>
          </div>
          <div class="p-3">
            <div class="text-[11px] text-slate-600">Total de archivos borrados</div>
            <div class="text-[22px] font-extrabold leading-6">${Number(
              totales.borrados || 0
            )}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfica barras -->
    ${
      mostrarGrafico
        ? `
    <div>
      <h2 class="text-[14px] font-extrabold text-slate-800 mb-2">Distribución de acciones</h2>
      <div class="rounded-lg border border-slate-300 p-3">
        <svg width="100%" height="200" viewBox="0 0 360 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico de barras">
          <rect x="24" y="24" width="312" height="150" fill="#ffffff" stroke="#cbd5e1"/>
          <line x1="24" y1="174" x2="336" y2="174" stroke="#cbd5e1" />
          ${svgBarras}
        </svg>
      </div>
    </div>`
        : `<div></div>`
    }
  </section>

  <!-- Separador -->
  <div class="h-4"></div>

  <!-- DETALLE POR MOVIMIENTO -->
  ${
    mostrarDetalle
      ? `
  <section>
    <h2 class="text-[14px] font-extrabold text-slate-800 mb-2">DETALLE POR MOVIMIENTO</h2>
    <table class="w-full border border-slate-300 rounded-lg overflow-hidden tabla-detalle">
      <thead>
        <tr class="border-b border-slate-300 text-left">
          <th class="px-3 py-2 w-[14%]">Fecha</th>
          <th class="px-3 py-2 w-[10%]">Hora</th>
          <th class="px-3 py-2 w-[16%]">Usuario</th>
          <th class="px-3 py-2 w-[18%]">Tipo de acción</th>
          <th class="px-3 py-2 w-[22%]">Archivo</th>
          <th class="px-3 py-2">Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${filasDetalle || ""}
      </tbody>
    </table>
  </section>`
      : ``
  }
</body>
</html>`;
}
