// templates/generarHTMLEventosArchivos.js
// Compatibilidad total con controladores antiguos y nuevos:
// - NUEVO: periodoLabel, fechaInicioTexto, fechaFinTexto
// - LEGACY: fechaInicio, fechaFin
// Además: opciones de marca, colores y switches de secciones

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
  // Cabecera y metadatos
  usuario = "admin",
  periodoLabel, // p.ej. "Mensual 07/2025" / "Anual 2025" / "Rango 2025-07-01 → 2025-07-31"
  fechaInicioTexto, // p.ej. "01/07/2025"
  fechaFinTexto, // p.ej. "31/07/2025"

  // Compatibilidad con controladores antiguos:
  fechaInicio, // p.ej. "2025-07-01" (legacy)
  fechaFin, // p.ej. "2025-07-31" (legacy)

  // Datos
  totales = { subidos: 0, reemplazados: 0, eliminados: 0, borrados: 0 },
  detalleMovimientos = [],

  // Branding
  logoUrl = null, // dataURL o URL pública
  tituloReporte = "REPORTE DE MOVIMIENTOS DE ARCHIVOS",
  subtituloReporte = null, // si lo envías, se mostrará debajo del título

  // Opciones visuales
  mostrarGrafico = true,
  mostrarDetalle = true,
  mostrarMarcaAgua = true,

  // Paleta (puedes sobreescribir desde el controlador)
  colorBorde = "#e2e8f0",
  colorTexto = "#0f172a",
  colorTextoSecundario = "#334155",
  colorFondoSuave = "#f8fafc",
  colorEncabezadoTabla = "#1f2937",

  // Estilos extra inline opcionales
  estilosPersonalizados = "",
} = {}) {
  // === Normalización de período mostrado en encabezado ===
  // Prioridad: periodoLabel + (fechaInicioTexto/fechaFinTexto) > legacy (fechaInicio/fechaFin)
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

  const sinMovimientos = !detalleMovimientos || detalleMovimientos.length === 0;

  // === Gráfico SVG (simple, sin librerías) ===
  const valores = [
    { etiqueta: "Subidos", valor: Number(totales.subidos || 0) },
    { etiqueta: "Reemplaz.", valor: Number(totales.reemplazados || 0) },
    { etiqueta: "Eliminados", valor: Number(totales.eliminados || 0) },
    { etiqueta: "Borrados", valor: Number(totales.borrados || 0) },
  ];
  const maxValor = Math.max(1, ...valores.map((v) => v.valor));
  const barrasSvg = valores
    .map((v, i) => {
      const w = 50,
        gap = 20,
        baseX = 30,
        baseY = 140,
        hMax = 100;
      const x = baseX + i * (w + gap);
      const h = (v.valor / maxValor) * hMax;
      const y = baseY - h;
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#94a3b8" />
        <text x="${x + w / 2}" y="${
        baseY + 14
      }" font-size="10" text-anchor="middle" fill="${colorTextoSecundario}">${escaparHtml(
        v.etiqueta
      )}</text>
        <text x="${x + w / 2}" y="${
        y - 4
      }" font-size="11" text-anchor="middle" fill="${colorTexto}">${
        v.valor
      }</text>
      `;
    })
    .join("");

  // === Filas del detalle ===
  const filasTabla = (detalleMovimientos || [])
    .map(
      (item) => `
      <tr class="border-b last:border-0">
        <td class="px-3 py-2">${escaparHtml(item.fecha || "")}</td>
        <td class="px-3 py-2">${escaparHtml(item.hora || "")}</td>
        <td class="px-3 py-2">${escaparHtml(item.usuario || "")}</td>
        <td class="px-3 py-2">${escaparHtml(item.tipoAccion || "")}</td>
        <td class="px-3 py-2">${escaparHtml(item.archivo || "")}</td>
        <td class="px-3 py-2">${escaparHtml(item.observaciones || "")}</td>
      </tr>
    `
    )
    .join("");

  // === Subtítulo (opcional) ===
  const bloqueSubtitulo = subtituloReporte
    ? `<p class="text-slate-600">${escaparHtml(subtituloReporte)}</p>`
    : "";

  return `
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <script src="https://cdn.tailwindcss.com"></script>
      <title>${escaparHtml(tituloReporte)}</title>
      <style>
        @page { size: A4; margin: 16mm 12mm; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: ${colorTexto}; }
        .marca-agua {
          position: absolute; inset: 0; display: ${
            sinMovimientos && mostrarMarcaAgua ? "flex" : "none"
          };
          align-items: center; justify-content: center; opacity: .12; pointer-events: none;
          font-weight: 800; font-size: 120px; color: ${colorTextoSecundario}; transform: rotate(-18deg);
        }
        .card { border: 1px solid ${colorBorde}; border-radius: 10px; }
        .grid-resumen > div { background: ${colorFondoSuave}; }
        .tabla-encabezado { background: ${colorEncabezadoTabla}; color: #ffffff; }
        ${estilosPersonalizados || ""}
      </style>
    </head>
    <body class="text-[12px] text-slate-800 relative">
      <div class="marca-agua">SIN MOVIMIENTOS</div>

      <!-- Encabezado -->
      <header class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          ${
            logoUrl
              ? `<img src="${escaparHtml(
                  logoUrl
                )}" class="w-10 h-10 object-contain" />`
              : `<div class="w-10 h-10 rounded-full border flex items-center justify-center text-[10px]">LOGO</div>`
          }
          <div>
            <h1 class="text-xl font-extrabold leading-5">${escaparHtml(
              tituloReporte
            )}</h1>
            <p class="text-slate-600">${periodoLegible}</p>
            ${bloqueSubtitulo}
          </div>
        </div>
        <div class="text-right">
          <p><span class="text-slate-500">Usuario:</span> ${escaparHtml(
            usuario
          )}</p>
          <p class="text-slate-500">Generado: ${escaparHtml(
            new Date().toLocaleString("es-VE")
          )}</p>
        </div>
      </header>

      <!-- Resumen + gráfico -->
      <section class="grid grid-cols-5 gap-4 mb-4">
        <div class="col-span-2 card p-3">
          <h2 class="font-bold text-slate-900 mb-2">RESUMEN GENERAL</h2>
          <div class="grid grid-cols-2 gap-2 grid-resumen">
            <div class="p-3 rounded">
              <p class="text-slate-500 text-[11px]">Total de archivos subidos</p>
              <p class="text-2xl font-extrabold">${Number(
                totales.subidos || 0
              )}</p>
            </div>
            <div class="p-3 rounded">
              <p class="text-slate-500 text-[11px]">Total de archivos reemplazados</p>
              <p class="text-2xl font-extrabold">${Number(
                totales.reemplazados || 0
              )}</p>
            </div>
            <div class="p-3 rounded">
              <p class="text-slate-500 text-[11px]">Total de archivos eliminados</p>
              <p class="text-2xl font-extrabold">${Number(
                totales.eliminados || 0
              )}</p>
            </div>
            <div class="p-3 rounded">
              <p class="text-slate-500 text-[11px]">Total de archivos borrados</p>
              <p class="text-2xl font-extrabold">${Number(
                totales.borrados || 0
              )}</p>
            </div>
          </div>
        </div>

        ${
          mostrarGrafico
            ? `<div class="col-span-3 card p-3">
                 <h2 class="font-bold text-slate-900 mb-2">Distribución de acciones</h2>
                 <svg width="100%" height="170" viewBox="0 0 360 170">
                   <rect x="30" y="30" width="300" height="110" fill="#ffffff" stroke="${colorBorde}"/>
                   ${barrasSvg}
                   <line x1="30" y1="140" x2="330" y2="140" stroke="#cbd5e1" />
                 </svg>
               </div>`
            : `<div class="col-span-3"></div>`
        }
      </section>

      <!-- Detalle -->
      ${
        mostrarDetalle
          ? `<section class="card p-3">
               <h2 class="font-bold text-slate-900 mb-2">DETALLE POR MOVIMIENTO</h2>
               ${
                 sinMovimientos
                   ? `<div class="p-4 bg-slate-50 border rounded text-center text-slate-600">
                        No se registraron movimientos en el período seleccionado.
                      </div>`
                   : `<table class="w-full border-collapse">
                        <thead class="tabla-encabezado">
                          <tr>
                            <th class="px-3 py-2 text-left">Fecha</th>
                            <th class="px-3 py-2 text-left">Hora</th>
                            <th class="px-3 py-2 text-left">Usuario</th>
                            <th class="px-3 py-2 text-left">Tipo de acción</th>
                            <th class="px-3 py-2 text-left">Archivo</th>
                            <th class="px-3 py-2 text-left">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${filasTabla}
                        </tbody>
                      </table>`
               }
             </section>`
          : ``
      }

      <footer class="mt-3 text-center text-[11px] text-slate-500">
        Sistema de Cotización y Gastos · Reporte generado automáticamente
      </footer>
    </body>
  </html>`;
}
