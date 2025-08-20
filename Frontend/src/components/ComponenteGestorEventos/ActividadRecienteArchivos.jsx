// src/components/ComponentesArchivos/ActividadRecienteArchivos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  SortAsc,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as IconImage,
  File as IconFile,
} from "lucide-react";
import api from "../../api/index";

const etiquetasEvento = {
  subida: {
    texto: "Agregado",
    clase:
      "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  },
  eliminacion: {
    texto: "Eliminado",
    clase: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/30",
  },
  sustitucion: {
    texto: "Reemplazado",
    clase: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  },
  edicion: {
    texto: "Editado",
    clase: "bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/30",
  },
  borrado_definitivo: {
    texto: "Borrado definitivo",
    clase: "bg-red-600/10 text-red-300 ring-1 ring-inset ring-red-600/30",
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
    clase: "bg-zinc-700/40 text-zinc-300 ring-1 ring-inset ring-zinc-600/50",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded-full ${meta.clase}`}
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
    cargarEventos();
  }, [filtroAccion, orden, busqueda, offset, registroTipo]);

  const eventosOrdenados = useMemo(
    () => [...eventos].sort(ordenarLocal),
    [eventos, orden]
  );
  const irSiguiente = () => setPagina((p) => p + 1);
  const irAnterior = () => setPagina((p) => Math.max(0, p - 1));

  const AvatarUsuario = ({ nombre = "Usuario" }) => {
    const iniciales = nombre
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <div className="h-7 w-7 rounded-full bg-slate-600/60 text-slate-100 grid place-content-center text-xs font-medium shrink-0">
        {iniciales}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto rounded-xl bg-slate-900 p-5 md:p-6">
      {/* Cabecera */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] md:text-xl font-semibold text-slate-100">
            Actividad Reciente
          </h2>

          {/* Ordenar por */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-[13px] text-slate-200 hover:bg-slate-750/60"
              title="Ordenar por"
            >
              <SortAsc className="h-4 w-4 text-slate-300" />
              <span>Ordenar por</span>
            </button>
            <select
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-[13px] text-slate-200 hover:bg-slate-800/80 focus:outline-none"
              value={orden}
              onChange={(e) => {
                setPagina(0);
                setOrden(e.target.value);
              }}
            >
              {opcionesOrden.map((op) => (
                <option key={op.clave} value={op.clave}>
                  {op.texto}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-300" />
            <span className="text-[13px] font-medium text-slate-300">
              Filtrar
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {opcionesFiltro.map((op) => {
              const activo = filtroAccion === op.clave;
              return (
                <button
                  key={op.clave}
                  onClick={() => {
                    setPagina(0);
                    setFiltroAccion(op.clave);
                  }}
                  className={[
                    "px-3 py-1.5 text-[12px] rounded-md border transition",
                    activo
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700/60",
                  ].join(" ")}
                  aria-pressed={activo}
                >
                  {op.texto}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {cargando &&
          Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="h-20 rounded-lg bg-slate-800/60 animate-pulse"
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
            const usuarioNombre =
              ev.usuarioNombre ||
              ev.usuario ||
              ev.usuarioAccion ||
              "Usuario Desconocido";
            const detalleAccion =
              ev.tipoEvento === "subida"
                ? "Agregó Archivo"
                : ev.tipoEvento === "eliminacion"
                ? "Eliminó Archivo"
                : ev.tipoEvento === "sustitucion"
                ? "Reemplazó Archivo"
                : ev.tipoEvento === "edicion"
                ? "Editó Archivo"
                : "Actividad";

            return (
              <motion.div
                key={ev.eventoId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg bg-slate-800 border border-slate-700 p-4 hover:bg-slate-750/60"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 text-slate-300">
                    {iconoPorExtension(ext)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-slate-100 truncate">
                        {ev.nombreArchivo || "Archivo sin nombre"}
                      </h3>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-300">
                      {etiqueta}
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300">
                        {fecha} · {hora}
                      </span>
                      {tam != null && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-300">
                            {abreviarBytes(tam)}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[12px]">
                      <AvatarUsuario nombre={usuarioNombre} />
                      <span className="text-slate-200">{usuarioNombre}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{detalleAccion}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {!cargando && !error && eventosOrdenados.length === 0 && (
        <div className="mt-8 text-center text-slate-400">
          No hay actividad para los filtros actuales.
        </div>
      )}
      {error && <div className="mt-4 text-center text-rose-400">{error}</div>}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={irAnterior}
          disabled={pagina === 0 || cargando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700/70 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>

        <div className="text-[13px] text-slate-400">Página {pagina + 1}</div>

        <button
          onClick={irSiguiente}
          disabled={!hayMas || cargando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700/70 disabled:opacity-50"
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
