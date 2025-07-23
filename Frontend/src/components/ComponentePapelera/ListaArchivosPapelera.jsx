// src/pages/Drive/ListaArchivosPapelera.jsx
import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  FileArchive,
  FileAudio,
  FileVideo,
  Image as IconoImagen,
  FileWarning,
  CalendarDays,
  HardDrive,
  FolderOpen,
  Search,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../api";

/*─────────────────── Componente principal ───────────────────*/
function ListaArchivosPapelera() {
  /*── Estados ──*/
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  /*── Cargar datos ──*/
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/archivos/papelera", {
          withCredentials: true,
        });
        setArchivos(data);
      } catch (error) {
        console.error("Error al obtener archivos", error);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  /*── Utilidades de formato ──*/
  const formatoFecha = (f) =>
    format(new Date(f), "yyyy-MM-dd", { locale: es }) ?? "-";

  const formatoTamano = (b) => {
    if (!b) return "-";
    const unidades = ["B", "KB", "MB", "GB"];
    let i = 0,
      valor = b;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(i ? 1 : 0)} ${unidades[i]}`;
  };

  const iconoPorExtension = (ext) => {
    const e = ext?.toLowerCase();
    if (["pdf", "doc", "docx", "txt"].includes(e))
      return <FileText size={40} className="text-gray-300" />;
    if (["jpg", "jpeg", "png", "gif"].includes(e))
      return <IconoImagen size={40} className="text-blue-400" />;
    if (["zip", "rar"].includes(e))
      return <FileArchive size={40} className="text-yellow-500" />;
    if (["mp3", "wav"].includes(e))
      return <FileAudio size={40} className="text-yellow-300" />;
    if (["mp4", "avi"].includes(e))
      return <FileVideo size={40} className="text-purple-400" />;
    return <FileWarning size={40} className="text-gray-400" />;
  };

  /*── Filtrado por búsqueda ──*/
  const archivosFiltrados = useMemo(
    () =>
      archivos.filter((a) =>
        a.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [archivos, busqueda]
  );

  /*───── Loader ─────*/
  if (cargando)
    return (
      <div className="p-6">
        <div className="h-64 bg-[#1C2434] rounded-2xl animate-pulse" />
      </div>
    );

  /*─────────────────── Render ───────────────────*/
  return (
    <div className="p-6 space-y-6">
      {/* ── Barra de búsqueda ── */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Buscar archivo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-[#2F374C] pl-10 pr-3 py-2 rounded-md text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── Grilla ── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-6">
        {archivosFiltrados.length ? (
          archivosFiltrados.map((a) => (
            <div
              key={a.id}
              className="bg-[#1C2434] w-[236px] h-[308px] rounded-2xl border border-[#2F374C] shadow flex flex-col items-center px-5 py-4 text-white transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Icono principal */}
              {iconoPorExtension(a.extension)}

              {/* Título */}
              <p className="mt-2 mb-1 text-lg font-semibold text-center line-clamp-2 break-words">
                {a.nombreOriginal}
              </p>

              {/* Metadatos */}
              <div className="flex flex-col gap-1 text-sm mt-1">
                <InfoLinea
                  icono={<CalendarDays size={14} />}
                  texto={`Eliminado: ${formatoFecha(a.actualizadoEn)}`}
                />
                <InfoLinea
                  icono={<HardDrive size={14} />}
                  texto={`Tamaño: ${formatoTamano(a.tamanioBytes)}`}
                />
                <InfoLinea
                  icono={<FolderOpen size={14} />}
                  texto={a.rutaOriginal || a.rutaS3 || "-"}
                />
              </div>

              {/* Botones */}
              <div className="mt-auto flex gap-2 pt-4">
                <button
                  onClick={() => console.log("Eliminar", a.id)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 text-sm rounded-md w-[100px]"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => console.log("Restaurar", a.id)}
                  className="bg-[#2F374C] hover:bg-[#3C465F] px-4 py-2 text-sm rounded-md w-[100px]"
                >
                  Restaurar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-16 text-sm">
            No hay archivos en la papelera
          </div>
        )}
      </div>

      {/* ── Vaciar papelera ── */}
      {archivos.length > 0 && (
        <button
          onClick={() => console.log("Vaciar papelera")}
          className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-md px-4 py-2 mt-4"
        >
          <Trash2 size={16} /> Vaciar papelera
        </button>
      )}
    </div>
  );
}

/*─────────────────── Sub-componente InfoLinea ───────────────────*/
function InfoLinea({ icono, texto }) {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      {icono}
      <span className="text-xs break-all leading-tight">{texto}</span>
    </div>
  );
}

export default ListaArchivosPapelera;
