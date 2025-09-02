// templates/generarHTMLEventosArchivos.js
import logoUrl from "../../Frontend/src/Styles/img/Point Technology.png";
/* Utilidades */
function escaparHtml(texto) {
  if (texto == null) return "";
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function formatearNumero(n) {
  const x = Number(n || 0);
  return new Intl.NumberFormat("es-VE").format(x);
}

/**
 * Genera el HTML A4 del reporte de eventos de archivos.
 * ► Mantiene los mismos nombres/estructura que consumes en el controlador.  :contentReference[oaicite:3]{index=3}
 * @param {Object} opciones
 * @param {string} opciones.usuario
 * @param {string} opciones.fechaInicioTexto  dd/mm/yyyy
 * @param {string} opciones.fechaFinTexto     dd/mm/yyyy
 * @param {Object} opciones.totales           { subidos, reemplazados, eliminados, borrados }
 * @param {Array}  opciones.detalleMovimientos [{fecha, hora, usuario, tipoAccion, archivo, observaciones}]
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
  mostrarGrafico = true,
  mostrarDetalle = true,
  tituloReporte = "REPORTE DE MOVIMIENTOS DE ARCHIVOS",
} = {}) {
  const periodoLegible = `Movimientos entre ${escaparHtml(
    fechaInicioTexto || "-"
  )} y ${escaparHtml(fechaFinTexto || "-")}`;

  /* ======= Datos para el gráfico ======= */
  const barras = [
    { etiqueta: "Subidos", valor: Number(totales.subidos || 0) },
    { etiqueta: "Reemplazados", valor: Number(totales.reemplazados || 0) },
    { etiqueta: "Eliminados", valor: Number(totales.eliminados || 0) },
    { etiqueta: "Borrados", valor: Number(totales.borrados || 0) },
  ];
  const maxValor = Math.max(1, ...barras.map((b) => b.valor));
  const svgBarras = barras
    .map((b, i) => {
      const anchoBarra = 48;
      const gap = 24;
      const baseX = 40;
      const baseY = 200;
      const altoMax = 130;
      const x = baseX + i * (anchoBarra + gap);
      const alto = (b.valor / maxValor) * altoMax;
      const y = baseY - alto;
      return `
      <rect x="${x}" y="${y}" width="${anchoBarra}" height="${alto}" rx="8" fill="#4f46e5" opacity="0.85"/>
      <text x="${x + anchoBarra / 2}" y="${
        y - 6
      }" font-size="12" font-weight="700" text-anchor="middle" fill="#111827">${
        b.valor
      }</text>
      <text x="${x + anchoBarra / 2}" y="${
        baseY + 18
      }" font-size="11" text-anchor="middle" fill="#475569">${escaparHtml(
        b.etiqueta
      )}</text>
    `;
    })
    .join("");

  /* ======= Filas del detalle ======= */
  const mapaAcciones = {
    subidaArchivo: "Subida",
    sustitucionArchivo: "Sustitución",
    eliminacionArchivo: "Eliminación",
    borradoDefinitivo: "Borrado definitivo",
  }; // coherente con ENUM BD. :contentReference[oaicite:4]{index=4}

  const filasDetalle = (detalleMovimientos || [])
    .map((r) => {
      const accionLegible = mapaAcciones[r.tipoAccion] || r.tipoAccion || "";
      return `
      <tr class="odd:bg-white even:bg-slate-50 border-b border-slate-200 break-inside-avoid">
        <td class="px-3 py-2">${escaparHtml(r.fecha || "")}</td>
        <td class="px-3 py-2">${escaparHtml(r.hora || "")}</td>
        <td class="px-3 py-2">${escaparHtml(r.usuario || "")}</td>
        <td class="px-3 py-2">${escaparHtml(accionLegible)}</td>
        <td class="px-3 py-2">${escaparHtml(r.archivo || "")}</td>
        <td class="px-3 py-2">${escaparHtml(r.observaciones || "")}</td>
      </tr>
    `;
    })
    .join("");

  /* ======= HTML ======= */
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escaparHtml(tituloReporte)}</title>
  <!-- Tailwind CDN para maquetado -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 14mm 14mm; }
    html, body { height: 100%; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
    .chip    { border:1px solid #c7d2fe; background:#eef2ff; color:#3730a3; }
    .card    { box-shadow: 0 1px 0 rgba(2,6,23,.06), 0 1px 2px -1px rgba(2,6,23,.1); }
    .soft    { box-shadow: 0 3px 14px rgba(30,58,138,.10); }
    .hdrBand { background: linear-gradient(90deg, #1f2937 0%, #0f172a 45%, #1d4ed8 100%); }
    .caption { color:#475569 }
    .tabla   { border:1px solid #cbd5e1; }
    .tabla th{ background:#f1f5f9; color:#0f172a; }
    .watermark { position: fixed; inset: 40% auto auto 50%; transform: translate(-50%, -50%); font-size: 72px; color:#e2e8f0; opacity:.12; font-weight:800; letter-spacing:.08em; pointer-events:none;}
  </style>
</head>
<body class="text-[12px]">
  <!-- CABECERA -->
  <div class="hdrBand rounded-xl text-white soft">
    <div class="flex items-center justify-between px-6 py-4">
      <div class="flex items-center gap-4">
        ${
          logoUrl
            ? `<img src="${escaparHtml(
                logoUrl
              )}" alt="logo" class="w-12 h-12 object-contain rounded-full ring-2 ring-indigo-200 bg-white">`
            : `<div class="w-12 h-12 rounded-full ring-2 ring-indigo-200 bg-white text-slate-700 flex items-center justify-center text-[10px] font-semibold">LOGO</div>`
        }
        <div>
          <h1 class="text-[22px] leading-6 font-extrabold tracking-tight">${escaparHtml(
            tituloReporte
          )}</h1>
          <p class="text-indigo-100/90 text-[12px]">${periodoLegible}</p>
          <div class="inline-flex items-center gap-2 mt-1">
            <span class="px-2 py-0.5 rounded-full chip text-[10px] bg-white/10 border-white/20 text-white">Eventos</span>
            <span class="px-2 py-0.5 rounded-full chip text-[10px] bg-white/10 border-white/20 text-white">Archivos</span>
          </div>
        </div>
      </div>
      <div class="text-right text-indigo-100/90">
        <div><span class="opacity-80">Usuario:</span> ${escaparHtml(
          usuario
        )}</div>
        <div><span class="opacity-80">Generado:</span> ${escaparHtml(
          new Date().toLocaleString("es-VE")
        )}</div>
      </div>
    </div>
  </div>

  <div class="h-4"></div>

  <!-- RESUMEN + GRAFICO -->
  <section class="grid grid-cols-2 gap-6">
    <!-- Tarjetas resumen -->
    <div class="space-y-3">
      <h2 class="text-[13px] font-extrabold">RESUMEN GENERAL</h2>

      <div class="grid grid-cols-2 gap-3">
        <!-- Card Subidos -->
        <div class="card rounded-xl p-4 border border-slate-200 bg-white">
          <div class="flex items-center gap-3">
            <div class="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <!-- icon upload -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l4 4h-3v6h-2V7H8l4-4z"></path><path d="M4 14h2v5h12v-5h2v7H4z"></path></svg>
            </div>
            <div>
              <div class="caption">Total de archivos subidos</div>
              <div class="text-[22px] font-extrabold leading-6">${formatearNumero(
                totales.subidos
              )}</div>
            </div>
          </div>
        </div>

        <!-- Card Reemplazados -->
        <div class="card rounded-xl p-4 border border-slate-200 bg-white">
          <div class="flex items-center gap-3">
            <div class="shrink-0 w-9 h-9 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
              <!-- icon replace -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h7l-2-2h4l3 3-3 3h-4l2-2H7V7zM17 17H10l2 2H8l-3-3 3-3h4l-2 2h7v2z"></path></svg>
            </div>
            <div>
              <div class="caption">Total de archivos reemplazados</div>
              <div class="text-[22px] font-extrabold leading-6">${formatearNumero(
                totales.reemplazados
              )}</div>
            </div>
          </div>
        </div>

        <!-- Card Eliminados -->
        <div class="card rounded-xl p-4 border border-slate-200 bg-white">
          <div class="flex items-center gap-3">
            <div class="shrink-0 w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <!-- icon trash -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9zM6 9h2v8H6V9z"></path></svg>
            </div>
            <div>
              <div class="caption">Total de archivos eliminados</div>
              <div class="text-[22px] font-extrabold leading-6">${formatearNumero(
                totales.eliminados
              )}</div>
            </div>
          </div>
        </div>

        <!-- Card Borrados definitivos -->
        <div class="card rounded-xl p-4 border border-slate-200 bg-white">
          <div class="flex items-center gap-3">
            <div class="shrink-0 w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <!-- icon eraser -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.24 3.56l4.24 4.24-9.9 9.9H6.34L2.1 13.46l9.9-9.9a2 2 0 012.83 0zM5.62 15.9l2.83 2.83h3.18l6.36-6.36-3.18-3.18-9.19 9.19zM20 20v2H8v-2h12z"/></svg>
            </div>
            <div>
              <div class="caption">Total de archivos borrados</div>
              <div class="text-[22px] font-extrabold leading-6">${formatearNumero(
                totales.borrados
              )}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico -->
    ${
      mostrarGrafico
        ? `
    <div class="card rounded-xl p-4 border border-slate-200 bg-white">
      <h2 class="text-[13px] font-extrabold mb-2">Distribución de acciones</h2>
      <div class="rounded-lg border border-slate-200 p-3">
        <svg width="100%" height="240" viewBox="0 0 380 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico de barras">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#93c5fd" />
              <stop offset="100%" stop-color="#dbeafe" />
            </linearGradient>
          </defs>
          <!-- marco -->
          <rect x="24" y="22" width="332" height="176" fill="url(#g1)" opacity="0.35" stroke="#cbd5e1"/>
          <!-- líneas horizontales -->
          ${[0, 1, 2, 3, 4]
            .map((i) => {
              const y = 198 - i * 35;
              return `<line x1="24" y1="${y}" x2="356" y2="${y}" stroke="#e2e8f0"/>`;
            })
            .join("")}
          ${svgBarras}
        </svg>
        <div class="mt-2 text-[10px] caption">Escala automática (máximo ${formatearNumero(
          maxValor
        )})</div>
      </div>
    </div>`
        : `<div></div>`
    }
  </section>

  <div class="h-4"></div>

  <!-- DETALLE POR MOVIMIENTO -->
  ${
    mostrarDetalle
      ? `
  <section>
    <h2 class="text-[13px] font-extrabold mb-2">DETALLE POR MOVIMIENTO</h2>
    <table class="w-full tabla rounded-xl overflow-hidden border-collapse">
      <thead>
        <tr class="text-left border-b border-slate-300">
          <th class="px-3 py-2 w-[12%]">Fecha</th>
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

  <!-- MARCA DE AGUA SUAVE -->
  <div class="watermark">Point Technology</div>

  <!-- PIE -->
  <footer class="mt-4 text-[10px] caption">
    * Fuente de datos: API Eventos de Archivos (rutas y controlador vigentes). :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}
  </footer>
</body>
</html>`;
}
