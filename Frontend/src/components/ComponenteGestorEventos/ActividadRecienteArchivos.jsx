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

/* ──────────────────────────────────────────────────────────────
   Tipos EXACTOS que usa el backend (eventosArchivo.accion)
   ────────────────────────────────────────────────────────────── */
const etiquetasEvento = {
  subidaArchivo: {
    texto: "Agregado",
    clase:
      "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  },
  eliminacionArchivo: {
    texto: "Eliminado",
    clase: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/30",
  },
  sustitucionArchivo: {
    texto: "Reemplazado",
    clase: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  },
  borradoDefinitivo: {
    texto: "Borrado definitivo",
    clase: "bg-red-600/10 text-red-300 ring-1 ring-inset ring-red-600/30",
  },
};

const accionesValidas = Object.keys(etiquetasEvento);

/* ───────────── Utilidades de presentación ───────────── */
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
    texto: tipoEvento || "Evento",
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

/* ───────────────────────────────────────────────────── */

export default function ActividadRecienteArchivos({
  pageSize = 10,
  registroTipo, // opcional: 'firmas' | 'facturasGastos' | 'comprobantesPagos' | 'abonosCXC'
}) {
  const [filtroAccion, setFiltroAccion] = useState("todos");
  const [orden, setOrden] = useState("reciente");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [eventos, setEventos] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [tiposDisponibles, setTiposDisponibles] = useState([]); // ← dinámico

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
        return (b.tamanioBytes ?? 0) - (a.tamanioBytes ?? 0);
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
        ...(filtroAccion !== "todos" &&
          accionesValidas.includes(filtroAccion) && { accion: filtroAccion }),
        ...(busqueda.trim() && { q: busqueda.trim() }),
        ...(registroTipo && { registroTipo }),
        limit,
        offset,
      };

      const { data } = await api.get("/archivos/eventos", { params });

      // Soportar varias formas de respuesta del backend:
      const items = Array.isArray(data)
        ? data
        : data.items || data.eventos || [];
      setEventos(items);

      // Determinar tipos disponibles: usar los que exponga la API o deducir de los items
      const tiposApi =
        (data && (data.tiposDisponibles || data.tipos || data.acciones)) || [];
      const tiposDeducidos = Array.from(
        new Set(
          items
            .map((ev) => ev.tipoEvento)
            .filter((t) => accionesValidas.includes(t))
        )
      );
      const nuevosTipos = (tiposApi.length ? tiposApi : tiposDeducidos).filter(
        (t) => accionesValidas.includes(t)
      );
      setTiposDisponibles(nuevosTipos);

      // Si el filtro actual deja de existir, restaurar a "todos"
      if (filtroAccion !== "todos" && !nuevosTipos.includes(filtroAccion)) {
        setFiltroAccion("todos");
      }

      const total = data?.total ?? null;
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

  // Cargar cuando cambian dependencias
  useEffect(() => {
    cargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroAccion, orden, busqueda, offset, registroTipo]);

  // Si cambia registroTipo, reseteo paginación y filtro
  useEffect(() => {
    setPagina(0);
    setFiltroAccion("todos");
  }, [registroTipo]);

  // Filtros mostrados: "Todos" + solo tipos presentes
  const opcionesFiltroDinamicas = useMemo(() => {
    const chips = tiposDisponibles.map((clave) => ({
      clave,
      texto: etiquetasEvento[clave]?.texto || clave,
    }));
    return [{ clave: "todos", texto: "Todos" }, ...chips];
  }, [tiposDisponibles]);

  // Filtro local adicional por si el backend no filtra por 'accion'
  const eventosFiltradosLocal = useMemo(() => {
    const base =
      filtroAccion === "todos"
        ? eventos
        : eventos.filter((e) => e.tipoEvento === filtroAccion);
    return [...base].sort(ordenarLocal);
  }, [eventos, filtroAccion, ordenarLocal]);

  const irSiguiente = () => setPagina((p) => p + 1);
  const irAnterior = () => setPagina((p) => Math.max(0, p - 1));

  const AvatarUsuario = ({ nombre = "Usuario" }) => {
    const iniciales = (nombre || "U")
      .split(" ")
      .filter(Boolean)
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

  const renderDetalleAccion = (tipo) => {
    switch (tipo) {
      case "subidaArchivo":
        return "Agregó Archivo";
      case "eliminacionArchivo":
        return "Eliminó Archivo";
      case "sustitucionArchivo":
        return "Reemplazó Archivo";
      case "borradoDefinitivo":
        return "Borrado Definitivo";
      default:
        return "Actividad";
    }
  };

  return (
    <div className="w-full mx-auto rounded-xl bg-slate-900 p-5 md:p-6">
      {/* Cabecera */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between gap-3">
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
              <option value="reciente">Más reciente</option>
              <option value="antiguo">Más antiguo</option>
              <option value="archivoAZ">Nombre A→Z</option>
              <option value="tamano">Tamaño</option>
            </select>
          </div>
        </div>

        {/* Buscador simple */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Buscar por nombre de archivo…"
            value={busqueda}
            onChange={(e) => {
              setPagina(0);
              setBusqueda(e.target.value);
            }}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Filtros dinámicos */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-300" />
            <span className="text-[13px] font-medium text-slate-300">
              Filtrar
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {opcionesFiltroDinamicas.map((op) => {
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

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {cargando &&
          Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="h-20 rounded-lg bg-slate-800/60 animate-pulse"
            />
          ))}

        {!cargando &&
          eventosFiltradosLocal.map((ev) => {
            // Campos esperados del backend:
            // eventoId, fechaEvento, tipoEvento, usuarioId, usuarioNombre,
            // archivoId, nombreArchivo, extension, tamanioBytes, registroTipo, registroId
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
            const detalleAccion = renderDetalleAccion(ev.tipoEvento);

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
                      {ev.registroTipo && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400">
                            {ev.registroTipo}
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

      {!cargando && !error && eventosFiltradosLocal.length === 0 && (
        <div className="mt-8 text-center text-slate-400">
          No hay actividad para los filtros actuales.
        </div>
      )}
      {error && <div className="mt-4 text-center text-rose-400">{error}</div>}

      {/* Paginación */}
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
