// src/components/ComponentePerfil/ArchivosRecientes.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/index.js";

function ArchivosRecientes({ limite = 6, rutaApi = "/perfil/recientes" }) {
  const [listaArchivos, setListaArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // carga inicial
  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await api.get(`${rutaApi}?limit=${limite}`, {
          withCredentials: true,
        });
        if (cancelado) return;
        const items = Array.isArray(res?.data?.archivosRecientes)
          ? res.data.archivosRecientes
          : [];
        setListaArchivos(items);
      } catch (e) {
        if (cancelado) return;
        console.error("Error al cargar archivos recientes:", e);
        setError("No se pudieron cargar los archivos recientes.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [rutaApi, limite]);

  // helpers
  const obtenerCategoriaIcono = (extension = "") => {
    const ext = String(extension).toLowerCase().replace(".", "");
    if (
      ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)
    )
      return { icono: "📄", color: "bg-blue-500/15 text-blue-400" }; // Documentos
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext))
      return { icono: "🖼️", color: "bg-emerald-500/15 text-emerald-400" }; // Imágenes
    if (["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm"].includes(ext))
      return { icono: "🎬", color: "bg-rose-500/15 text-rose-400" }; // Videos
    if (["mp3", "wav", "aac", "ogg", "flac"].includes(ext))
      return { icono: "🎵", color: "bg-purple-500/15 text-purple-400" }; // Audio
    return { icono: "📦", color: "bg-slate-500/15 text-slate-300" }; // Otros
  };

  const acortarNombre = (nombre = "", max = 26) =>
    nombre.length > max ? nombre.slice(0, max - 1) + "…" : nombre;

  // tiempo relativo en español (ej: "hace 2 horas", "ayer", "hace 3 días", "hace 1 semana")
  const formatearTiempoRelativo = (fechaStr) => {
    if (!fechaStr) return "";
    const ahora = new Date();
    const fecha = new Date(fechaStr);
    const diffMs = fecha.getTime() - ahora.getTime();
    const segundos = Math.round(diffMs / 1000);
    const minutos = Math.round(segundos / 60);
    const horas = Math.round(minutos / 60);
    const dias = Math.round(horas / 24);
    const semanas = Math.round(dias / 7);

    const rtf = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

    if (Math.abs(segundos) < 60) return rtf.format(segundos, "second");
    if (Math.abs(minutos) < 60) return rtf.format(minutos, "minute");
    if (Math.abs(horas) < 24) return rtf.format(horas, "hour");
    if (Math.abs(dias) < 7) return rtf.format(dias, "day");
    return rtf.format(semanas, "week");
  };

  const itemsVista = useMemo(
    () =>
      (listaArchivos || []).slice(0, limite).map((a) => {
        const meta = obtenerCategoriaIcono(a.extension);
        return {
          id: a.id,
          nombre: a.nombreOriginal || "Archivo",
          tiempo: formatearTiempoRelativo(a.creadoEn),
          ...meta,
        };
      }),
    [listaArchivos, limite]
  );

  return (
    <div className="w-[360px] sm:w-[420px] bg-[#0f172a] rounded-2xl p-5 shadow-lg border border-white/10">
      <h3 className="text-white text-lg font-semibold">Archivos Recientes</h3>
      <p className="text-slate-400 text-sm mt-1">
        Accedidos o modificados recientemente.
      </p>

      {/* estados */}
      {cargando ? (
        <div className="mt-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded bg-slate-700/50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 mt-4">{error}</p>
      ) : itemsVista.length === 0 ? (
        <p className="text-slate-400 mt-4">Sin archivos recientes.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {itemsVista.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 px-2 py-2 rounded hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${it.color}`}
                >
                  <span className="text-base leading-none">{it.icono}</span>
                </div>
                <span className="text-slate-200 text-sm truncate">
                  {acortarNombre(it.nombre)}
                </span>
              </div>
              <span className="text-slate-400 text-xs shrink-0">
                {it.tiempo}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ArchivosRecientes;
