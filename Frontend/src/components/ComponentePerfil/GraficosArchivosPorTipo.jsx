import { useEffect, useMemo, useState } from "react";
import api from "../../api/index.js";

/**
 * GraficoArchivosPorTipo
 * - Barras horizontales con grid punteado vertical (25/50/75%).
 * - Datos reales desde /perfil/archivos-por-tipo (o la ruta que pases).
 * - Todo en español y camelCase.
 */
function GraficosArchivosPorTipo({ rutaApi = "/perfil/archivos-por-tipo" }) {
  // estado
  const [datosPorTipo, setDatosPorTipo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // carga de datos
  useEffect(() => {
    let cancelado = false;

    (async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await api.get(rutaApi, { withCredentials: true });

        if (cancelado) return;

        const base = res?.data || {};
        const datos =
          base?.datos && typeof base.datos === "object" ? base.datos : base;

        const normalizado = {
          documentos: Number(datos.documentos || 0),
          imagenes: Number(datos.imagenes || 0),
          videos: Number(datos.videos || 0),
          audio: Number(datos.audio || 0),
          otros: Number(datos.otros || 0),
        };

        setDatosPorTipo(normalizado);
      } catch (e) {
        if (cancelado) return;
        console.error("Error en GraficosArchivosPorTipo:", e);
        setError("No se pudieron cargar las estadísticas por tipo.");
        setDatosPorTipo(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [rutaApi]);

  // lista con etiquetas y valores (en español)
  const lista = useMemo(() => {
    const base = datosPorTipo ?? {
      documentos: 0,
      imagenes: 0,
      videos: 0,
      audio: 0,
      otros: 0,
    };
    return [
      { clave: "documentos", etiqueta: "Documentos", valor: base.documentos },
      { clave: "imagenes", etiqueta: "Imágenes", valor: base.imagenes },
      { clave: "videos", etiqueta: "Videos", valor: base.videos },
      { clave: "audio", etiqueta: "Audio", valor: base.audio },
      { clave: "otros", etiqueta: "Otros", valor: base.otros },
    ];
  }, [datosPorTipo]);

  // máximo para escalar las barras
  const maximo = useMemo(
    () => Math.max(...lista.map((i) => i.valor), 1),
    [lista]
  );

  return (
    <div className="w-[360px] sm:w-[420px] bg-[#1f2937] rounded-[18px] p-5 shadow-lg border border-white/10 relative">
      {/* borde redondeado estilo mock */}
      <div className="absolute inset-0 rounded-[18px] pointer-events-none border border-white/10" />

      {/* Título y subtítulo */}
      <h3 className="text-white text-lg font-semibold">Archivos por Tipo</h3>
      <p className="text-slate-400 text-sm mt-1">
        Distribución de tus datos almacenados.
      </p>

      {/* Carga / error / datos */}
      {cargando ? (
        <div className="mt-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-7 bg-slate-700/50 rounded animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 mt-4">{error}</p>
      ) : (
        <div className="mt-5 space-y-4 relative">
          {/* Grid vertical punteado (25%, 50%, 75%) */}
          <div className="absolute inset-0 -z-0">
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 border-l border-dashed border-slate-500/40"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {/* Barras */}
          <div className="relative z-10 space-y-4">
            {lista.map((item) => {
              const ancho = `${(item.valor / maximo) * 100}%`;
              return (
                <div key={item.clave} className="w-full">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-sm">
                      {item.etiqueta}
                    </span>
                    <span className="text-slate-400 text-sm">{item.valor}</span>
                  </div>
                  <div className="h-7 w-full bg-[#1f2937] rounded">
                    <div
                      className="h-7 rounded bg-[#2563eb]"
                      style={{ width: ancho }}
                      aria-label={`${item.etiqueta} (${item.valor})`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GraficosArchivosPorTipo;
