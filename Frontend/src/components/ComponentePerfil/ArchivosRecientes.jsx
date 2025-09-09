import { useEffect, useMemo, useState } from "react";
import api from "../../api/index.js";
import {
  FileText,
  Image as IconImage,
  Film,
  Music,
  File as FileGeneric,
} from "lucide-react";

function ArchivosRecientes({ limite = 6, rutaApi = "/perfil/recientes" }) {
  const [listaArchivos, setListaArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // carga inicial (datos REALES del backend)
  useEffect(() => {
    let cancelado = false;
    (async () => {
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
    })();
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
      return { Icono: FileText, bg: "bg-blue-500/15", tx: "text-blue-400" }; // Documentos
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext))
      return {
        Icono: IconImage,
        bg: "bg-emerald-500/15",
        tx: "text-emerald-400",
      }; // Imágenes
    if (["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm"].includes(ext))
      return { Icono: Film, bg: "bg-rose-500/15", tx: "text-rose-400" }; // Videos
    if (["mp3", "wav", "aac", "ogg", "flac"].includes(ext))
      return { Icono: Music, bg: "bg-purple-500/15", tx: "text-purple-400" }; // Audio
    return { Icono: FileGeneric, bg: "bg-slate-500/15", tx: "text-slate-300" }; // Otros
  };

  const acortarNombre = (nombre = "", max = 28) =>
    nombre.length > max ? nombre.slice(0, max - 1) + "…" : nombre;

  // “hace 2 horas / ayer / hace 3 días / hace 1 semana”
  const formatearTiempoRelativo = (fechaStr) => {
    if (!fechaStr) return "";
    const ahora = new Date();
    const fecha = new Date(fechaStr);
    const diffMs = fecha.getTime() - ahora.getTime(); // negativo si fue en el pasado
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

  // vista normalizada (icono, nombre, tiempo)
  const itemsVista = useMemo(
    () =>
      (listaArchivos || []).slice(0, limite).map((a) => {
        const { Icono, bg, tx } = obtenerCategoriaIcono(a.extension);
        return {
          id: a.id,
          nombre: a.nombreOriginal || "Archivo",
          tiempo: formatearTiempoRelativo(a.creadoEn),
          Icono,
          bg,
          tx,
        };
      }),
    [listaArchivos, limite]
  );

  return (
    <div className="w-[360px] sm:w-[420px] bg-[#0f172a] rounded-[18px] p-5 shadow-lg border border-white/10">
      {/* Título y subtítulo (en español) */}
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
              className="h-11 rounded bg-slate-700/40 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 mt-4">{error}</p>
      ) : itemsVista.length === 0 ? (
        <p className="text-slate-400 mt-4">Sin archivos recientes.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {itemsVista.map(({ id, nombre, tiempo, Icono, bg, tx }) => (
            <li key={id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-8 w-8 rounded flex items-center justify-center ${bg}`}
                >
                  <Icono className={`h-4 w-4 ${tx}`} />
                </div>
                <span className="text-slate-200 text-sm truncate">
                  {acortarNombre(nombre)}
                </span>
              </div>
              <span className="text-slate-400 text-xs shrink-0">{tiempo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ArchivosRecientes;
