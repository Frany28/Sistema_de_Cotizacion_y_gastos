// src/pages/Drive/ListaArchivosPapelera.jsx
import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  FileArchive,
  FileAudio,
  FileVideo,
  Image as IconoImagen,
  FileWarning,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../api";

function ListaArchivosPapelera() {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState({ campo: "actualizadoEn", asc: false });

  useEffect(() => {
    const obtenerArchivos = async () => {
      try {
        const { data } = await api.get("/archivos/papelera", {
          withCredentials: true,
        });
        setArchivos(data);
      } catch (error) {
        console.error("Error al obtener archivos eliminados", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerArchivos();
  }, []);

  const formatoFecha = (fecha) => {
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(date.getTime())) return "-";

    const horas = (Date.now() - date.getTime()) / 3_600_000;
    return horas < 48
      ? formatDistanceToNowStrict(date, { locale: es, addSuffix: true })
      : format(date, "yyyy-MM-dd", { locale: es });
  };

  const formatoTamano = (bytes) => {
    if (!bytes) return "-";
    const unidades = ["B", "KB", "MB", "GB"];
    let i = 0;
    let valor = bytes;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(i ? 1 : 0)} ${unidades[i]}`;
  };

  const iconoPorExtension = (ext) => {
    const e = ext?.toLowerCase();
    switch (e) {
      case "pdf":
        return <FileText size={18} className="text-red-400" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <IconoImagen size={18} className="text-cyan-400" />;
      case "zip":
      case "rar":
        return <FileArchive size={18} className="text-amber-400" />;
      case "mp3":
      case "wav":
        return <FileAudio size={18} className="text-yellow-400" />;
      case "mp4":
      case "avi":
        return <FileVideo size={18} className="text-violet-400" />;
      default:
        return <FileWarning size={18} className="text-gray-400" />;
    }
  };

  const archivosFiltrados = useMemo(() => {
    return archivos
      .filter((a) =>
        a.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
      )
      .sort((a, b) => {
        const factor = orden.asc ? 1 : -1;
        return (
          factor *
          (a[orden.campo]?.localeCompare?.(b[orden.campo]) ||
            a[orden.campo] - b[orden.campo])
        );
      });
  }, [archivos, busqueda, orden]);

  if (cargando) {
    return (
      <div className="w-full bg-gray-800 rounded-xl p-4 animate-pulse h-64 shadow-lg" />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {archivosFiltrados.length > 0 ? (
        archivosFiltrados.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex flex-col"
          >
            <div className="flex flex-col gap-1 text-gray-700 mb-4">
              <div className="flex items-center gap-2 text-gray-900 text-base font-medium">
                {iconoPorExtension(a.extension)}
                <span className="truncate">{a.nombreOriginal}</span>
              </div>
              <p className="text-xs text-gray-500">
                Eliminado: {formatoFecha(a.actualizadoEn)}
              </p>
              <p className="text-xs text-gray-500">
                Tamaño: {formatoTamano(a.tamanioBytes)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Ruta Original: {a.rutaOriginal || "-"}
              </p>
            </div>

            <div className="mt-auto flex justify-between gap-2">
              <button
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded w-1/2"
                onClick={() => console.log("Eliminar", a.id)}
              >
                Eliminar
              </button>
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-3 py-1.5 rounded w-1/2"
                onClick={() => console.log("Restaurar", a.id)}
              >
                Restaurar
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full text-center text-gray-500 py-10 text-sm">
          {busqueda
            ? "No se encontraron resultados para tu búsqueda"
            : "No hay archivos en papelera"}
        </div>
      )}
    </div>
  );
}

export default ListaArchivosPapelera;
