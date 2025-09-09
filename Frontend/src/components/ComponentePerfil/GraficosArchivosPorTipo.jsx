import { useEffect, useMemo, useState } from "react";
import api from "../../api/index.js";

/**
 * GraficoArchivosPorTipo
 * - Replica el diseño del mock: barras horizontales por tipo.
 * - Textos en español: "Archivos por Tipo" / "Distribución de tus datos almacenados."
 * - Llama al backend usando el mismo patrón que AlmacenamientoUtilizado (con cookies).
 *
 * Props:
 *  - rutaApi (string): endpoint que devuelve conteos por tipo.
 *    Formato esperado (acepta ambos):
 *    { ok:true, datos:{ documentos, imagenes, videos, audio, otros } }
 *    o { documentos, imagenes, videos, audio, otros }
 */
function GraficoArchivosPorTipo({ rutaApi = "/archivos/estadistica/tipos" }) {
  // estado
  const [datosPorTipo, setDatosPorTipo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // carga de datos (mismo patrón que tu tarjeta de perfil)
  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await api.get(rutaApi, { withCredentials: true });
        if (cancelado) return;

        // soportar dos estructuras de respuesta
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
        console.error("Error en GraficoArchivosPorTipo:", e);
        setError("No se pudieron cargar las estadísticas por tipo.");
        // OPCIONAL: datos simulados para visualizar el layout cuando el backend aún no está listo
        setDatosPorTipo({
          documentos: 42,
          imagenes: 96,
          videos: 18,
          audio: 5,
          otros: 6,
        });
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [rutaApi]);

  // preparar lista con etiquetas en español y valores
  const lista = useMemo(() => {
    const base = datosPorTipo || {
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

  // escalar ancho de barras respecto al mayor valor
  const maximo = useMemo(
    () => Math.max(...lista.map((i) => i.valor), 1),
    [lista]
  );

  return (
    <div className="w-[360px] sm:w-[420px] bg-[#0f172a] rounded-2xl p-5 shadow-lg border border-white/10">
      <h3 className="text-white text-lg font-semibold">Archivos por Tipo</h3>
      <p className="text-slate-400 text-sm mt-1">
        Distribución de tus datos almacenados.
      </p>

      {/* estado de carga */}
      {cargando ? (
        <div className="mt-5 space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div
              key={idx}
              className="h-6 bg-slate-700/60 rounded animate-pulse"
            />
          ))}
        </div>
      ) : error && !datosPorTipo ? (
        <p className="text-red-400 mt-4">{error}</p>
      ) : (
        <div className="mt-5 space-y-4">
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
                <div className="h-6 w-full bg-[#111827] rounded">
                  <div
                    className="h-6 rounded bg-[#2563eb]"
                    style={{ width: ancho }}
                    aria-label={`${item.etiqueta} (${item.valor})`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GraficoArchivosPorTipo;
