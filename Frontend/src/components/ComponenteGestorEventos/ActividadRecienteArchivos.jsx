// src/components/ActividadArchivos/ActividadRecienteArchivos.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const etiquetaAccion = (accion) => {
  switch (accion) {
    case "subida":
      return "Archivo agregado";
    case "eliminacion":
      return "Archivo eliminado";
    case "sustitucion":
      return "Archivo reemplazado";
    case "borradoDefinitivo":
      return "Borrado definitivo";
    case "edicionMetadatos":
      return "Metadatos editados";
    case "restauracion":
      return "Archivo restaurado";
    case "descarga":
      return "Archivo descargado";
    default:
      return "Evento";
  }
};

const obtenerIniciales = (nombre = "") =>
  nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "US";

const formatearFechaHora = (iso) => {
  const f = new Date(iso);
  const fecha = f.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hora = f.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { fecha, hora };
};

export default function ActividadRecienteArchivos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("recientes"); // “recientes” o “antiguos”
  const [limit, setLimit] = useState(12);
  const [offset, setOffset] = useState(0);

  const cargarEventos = async () => {
    try {
      setCargando(true);
      setError("");
      const params = { limit, offset };
      if (filtroAccion !== "todos") params.accion = filtroAccion; // subida | eliminacion | sustitucion ...
      const { data } = await axios.get("/api/eventos-archivos/actividad", {
        params,
        withCredentials: true,
      });
      const lista = Array.isArray(data?.eventos) ? data.eventos : [];
      setEventos(lista);
    } catch (e) {
      setError("No se pudo cargar la actividad.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAccion, limit, offset]);

  const eventosOrdenados = useMemo(() => {
    const copia = [...eventos];
    copia.sort((a, b) => {
      const da = new Date(a.fechaEvento).getTime();
      const db = new Date(b.fechaEvento).getTime();
      return ordenarPor === "recientes" ? db - da : da - db;
    });
    return copia;
  }, [eventos, ordenarPor]);

  return (
    <section className="w-full">
      {/* Filtros superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded-full text-sm border ${
              filtroAccion === "todos"
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-transparent text-slate-300 border-slate-600"
            }`}
            onClick={() => {
              setOffset(0);
              setFiltroAccion("todos");
            }}
          >
            Todos
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm border ${
              filtroAccion === "subida"
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-transparent text-slate-300 border-slate-600"
            }`}
            onClick={() => {
              setOffset(0);
              setFiltroAccion("subida");
            }}
          >
            Agregado
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm border ${
              filtroAccion === "eliminacion"
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-transparent text-slate-300 border-slate-600"
            }`}
            onClick={() => {
              setOffset(0);
              setFiltroAccion("eliminacion");
            }}
          >
            Eliminado
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm border ${
              filtroAccion === "sustitucion"
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-transparent text-slate-300 border-slate-600"
            }`}
            onClick={() => {
              setOffset(0);
              setFiltroAccion("sustitucion");
            }}
          >
            Reemplazado
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Ordenar por</label>
          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-md px-2 py-1"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
          </select>
        </div>
      </div>

      {/* Grid de tarjetas */}
      {cargando ? (
        <div className="text-slate-300">Cargando actividad…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {eventosOrdenados.map((ev) => {
            const { fecha, hora } = formatearFechaHora(ev.fechaEvento);
            const iniciales = obtenerIniciales(ev.usuarioNombre);
            return (
              <article
                key={ev.eventoId}
                className="bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Icono según extensión (placeholder simple con círculo e iniciales) */}
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-sm font-semibold">
                    {ev.extension?.slice(0, 3)?.toUpperCase() || "DOC"}
                  </div>

                  <div className="flex-1">
                    <header className="flex items-center justify-between">
                      <h3 className="text-slate-100 text-sm font-semibold truncate">
                        {ev.nombreArchivo}
                      </h3>
                      <span className="text-[11px] text-slate-400 ml-3 whitespace-nowrap">
                        {hora}
                      </span>
                    </header>

                    <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{fecha}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-600 text-[10px] text-slate-200 flex items-center justify-center">
                          {iniciales}
                        </span>
                        {ev.usuarioNombre || "Usuario"}
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] text-slate-300">
                      {etiquetaAccion(ev.tipoEvento)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Paginación simple */}
      <div className="flex items-center justify-between mt-4">
        <button
          className="px-3 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-200 disabled:opacity-50"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          Anterior
        </button>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Mostrar</span>
          <select
            value={limit}
            onChange={(e) => {
              setOffset(0);
              setLimit(Number(e.target.value));
            }}
            className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-md px-2 py-1"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
          </select>
          <span className="text-slate-400 text-sm">eventos</span>
        </div>
        <button
          className="px-3 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-200"
          onClick={() => setOffset(offset + limit)}
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}
