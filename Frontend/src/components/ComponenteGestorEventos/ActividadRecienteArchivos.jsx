// src/components/ComponentesArchivos/ActividadRecienteArchivos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  SortAsc,
  Search,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as IconImage,
  File as IconFile,
  User,
} from "lucide-react";
import api from "../../api/index";

const etiquetasEvento = {
  subida: {
    texto: "Agregado",
    clase: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  },
  eliminacion: {
    texto: "Eliminado",
    clase: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  },
  sustitucion: {
    texto: "Reemplazado",
    clase: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  },
  edicion: {
    texto: "Editado",
    clase: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30",
  },
  borrado_definitivo: {
    texto: "Borrado definitivo",
    clase: "bg-red-600/15 text-red-400 ring-1 ring-red-600/30",
  },
};

const opcionesFiltro = [
  { clave: "todos", texto: "Todos" },
  { clave: "subida", texto: "Agregado" },
  { clave: "eliminacion", texto: "Eliminado" },
  { clave: "sustitucion", texto: "Reemplazado" },
  { clave: "edicion", texto: "Editado" },
  { clave: "borrado_definitivo", texto: "Borrado definitivo" },
];

const opcionesOrden = [
  { clave: "reciente", texto: "Más reciente" },
  { clave: "antiguo", texto: "Más antiguo" },
  { clave: "archivoAZ", texto: "Nombre A→Z" },
  { clave: "tamano", texto: "Tamaño" },
];

function formatearFechaHora(fechaIso) {
  try {
    const fecha = new Date(fechaIso);
    const f = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium" }).format(
      fecha
    );
    const h = new Intl.DateTimeFormat("es-VE", { timeStyle: "short" }).format(
      fecha
    );
    return { fecha: f, hora: h };
  } catch {
    return { fecha: "—", hora: "—" };
  }
}
function abreviarBytes(bytes) {
  if (bytes == null) return "—";
  const unidades = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < unidades.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${unidades[i]}`;
}
function iconoPorExtension(ext = "") {
  const e = ext.toLowerCase();
  if (["doc", "docx", "txt", "md"].includes(e))
    return <FileText className="h-5 w-5" />;
  if (["xls", "xlsx", "csv"].includes(e))
    return <FileSpreadsheet className="h-5 w-5" />;
  if (["zip", "rar", "7z"].includes(e))
    return <FileArchive className="h-5 w-5" />;
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(e))
    return <IconImage className="h-5 w-5" />;
  return <IconFile className="h-5 w-5" />;
}
function chipEvento(tipoEvento) {
  const meta = etiquetasEvento[tipoEvento] || {
    texto: tipoEvento,
    clase: "bg-zinc-600/20 text-zinc-300 ring-1 ring-zinc-600/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${meta.clase}`}
    >
      {meta.texto}
    </span>
  );
}

export default function ActividadRecienteArchivos({
  pageSize = 10,
  registroTipo,
}) {
  const [filtroAccion, setFiltroAccion] = useState("todos");
  const [orden, setOrden] = useState("reciente");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [eventos, setEventos] = useState([]);
  const [hayMas, setHayMas] = useState(false);

  const limit = pageSize;
  const offset = useMemo(() => pagina * limit, [pagina, limit]);

  const ordenarLocal = (a, b) => {
    switch (orden) {
      case "antiguo":
        return new Date(a.fechaEvento) - new Date(b.fechaEvento);
      case "archivoAZ":
        return (a.nombreArchivo || "").localeCompare(
          b.nombreArchivo || "",
          "es",
          { sensitivity: "base" }
        );
      case "tamano":
        return (
          (b.tamanioBytesVersion ?? b.tamanioArchivo ?? 0) -
          (a.tamanioBytesVersion ?? a.tamanioArchivo ?? 0)
        );
      case "reciente":
      default:
        return new Date(b.fechaEvento) - new Date(a.fechaEvento);
    }
  };

  const cargarEventos = async () => {
    setCargando(true);
    setError("");
    try {
      const params = {
        ...(filtroAccion !== "todos" && { accion: filtroAccion }),
        ...(busqueda.trim() && { q: busqueda.trim() }),
        ...(registroTipo && { registroTipo }),
        limit,
        offset,
      };
      // ← igual que el historial, usamos el cliente axios `api`
      const { data } = await api.get("/archivos/eventos", { params });

      const items = Array.isArray(data)
        ? data
        : data.items || data.eventos || [];
      setEventos(items);

      const total = data.total ?? null;
      setHayMas(
        total != null ? offset + items.length < total : items.length === limit
      );
    } catch (e) {
      console.error(e);
      setError("No se pudo obtener la actividad reciente.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEventos(); /* eslint-disable-next-line */
  }, [filtroAccion, orden, busqueda, offset, registroTipo]);

  const eventosOrdenados = useMemo(
    () => [...eventos].sort(ordenarLocal),
    [eventos, orden]
  );
  const irSiguiente = () => setPagina((p) => p + 1);
  const irAnterior = () => setPagina((p) => Math.max(0, p - 1));

  return (
    <div className="w-full mx-auto">
      {/* Barra superior de filtros y búsqueda */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-3 items-center">
        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-400 flex items-center gap-1">
            <Filter className="h-4 w-4" /> Filtrar
          </span>
          {opcionesFiltro.map((op) => (
            <button
              key={op.clave}
              onClick={() => {
                setPagina(0);
                setFiltroAccion(op.clave);
              }}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                filtroAccion === op.clave
                  ? "bg-zinc-800/60 text-white border-zinc-600"
                  : "bg-zinc-900/40 text-zinc-300 border-zinc-700 hover:bg-zinc-800/60"
              }`}
              aria-pressed={filtroAccion === op.clave}
            >
              {op.texto}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              value={busqueda}
              onChange={(e) => {
                setPagina(0);
                setBusqueda(e.target.value);
              }}
              placeholder="Buscar por archivo o usuario..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
        </div>

        {/* Ordenar */}
        <div className="flex items-center gap-2 justify-start lg:justify-end">
          <span className="text-sm text-zinc-400 flex items-center gap-1">
            <SortAsc className="h-4 w-4" /> Ordenar por
          </span>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            {opcionesOrden.map((op) => (
              <option key={op.clave} value={op.clave}>
                {op.texto}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cargando &&
          Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="h-24 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
            />
          ))}

        {!cargando &&
          eventosOrdenados.map((ev) => {
            const ext =
              ev.extensionVersion || ev.extensionArchivo || ev.extension || "";
            const tam =
              ev.tamanioBytesVersion ??
              ev.tamanioArchivo ??
              ev.tamanioBytes ??
              null;
            const { fecha, hora } = formatearFechaHora(ev.fechaEvento);
            const etiqueta = chipEvento(ev.tipoEvento);

            return (
              <motion.div
                key={ev.eventoId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 shadow-lg shadow-black/10"
              >
                <div className="p-4 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 text-zinc-300">
                    {iconoPorExtension(ext)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-zinc-100 truncate">
                        {ev.nombreArchivo || "Archivo sin nombre"}
                      </h3>
                      {etiqueta}
                    </div>
                    <div className="mt-1 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-4 w-4" />{" "}
                        {ev.usuarioNombre || "Usuario desconocido"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {fecha} · {hora}
                      </span>
                      {ext && <span className="uppercase">.{ext}</span>}
                      {tam != null && <span>{abreviarBytes(tam)}</span>}
                      {ev.numeroVersion && <span>v{ev.numeroVersion}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* Estado vacío / error */}
      {!cargando && !error && eventosOrdenados.length === 0 && (
        <div className="mt-8 text-center text-zinc-400">
          No hay actividad para los filtros actuales.
        </div>
      )}
      {error && <div className="mt-4 text-center text-red-400">{error}</div>}

      {/* Paginación */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={irAnterior}
          disabled={pagina === 0 || cargando}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/60 text-zinc-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <div className="text-sm text-zinc-400">Página {pagina + 1}</div>
        <button
          onClick={irSiguiente}
          disabled={!hayMas || cargando}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/60 text-zinc-100 disabled:opacity-40"
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
