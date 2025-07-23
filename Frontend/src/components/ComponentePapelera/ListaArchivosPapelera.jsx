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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../api";

function ListaArchivosPapelera() {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

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
    return format(date, "yyyy-MM-dd", { locale: es });
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
        return <FileText size={30} className="text-gray-300 mx-auto" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <IconoImagen size={30} className="text-blue-400 mx-auto" />;
      case "zip":
      case "rar":
        return <FileArchive size={30} className="text-yellow-500 mx-auto" />;
      case "mp3":
      case "wav":
        return <FileAudio size={30} className="text-yellow-300 mx-auto" />;
      case "mp4":
      case "avi":
        return <FileVideo size={30} className="text-purple-400 mx-auto" />;
      default:
        return <FileWarning size={30} className="text-gray-400 mx-auto" />;
    }
  };

  const archivosFiltrados = useMemo(() => {
    return archivos.filter((a) =>
      a.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [archivos, busqueda]);

  if (cargando) {
    return (
      <div className="w-full bg-white rounded-lg p-4 animate-pulse h-64 shadow-sm" />
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {archivosFiltrados.length > 0 ? (
          archivosFiltrados.map((archivo) => (
            <div
              key={archivo.id}
              className="bg-[#1C2434] rounded-xl w-[236px] h-[251px] shadow border border-[#2F374C] flex flex-col justify-between px-4 py-3 text-white text-[16px]"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-2">
                  {iconoPorExtension(archivo.extension)}
                </div>

                <p className="font-semibold text-[13px] text-center mb-2 break-words leading-tight line-clamp-2 max-h-[32px] overflow-hidden">
                  {archivo.nombreOriginal}
                </p>

                <p className="text-[12px] text-gray-400 mb-1">
                  Eliminado: {formatoFecha(archivo.actualizadoEn)}
                </p>
                <p className="text-[12px] text-gray-400 mb-1">
                  Tamaño: {formatoTamano(archivo.tamanioBytes)}
                </p>
              </div>

              <div className="flex justify-between gap-2 mt-4">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded px-3 py-1.5 w-[82px] h-[32px]"
                  onClick={() => console.log("Eliminar", archivo.id)}
                >
                  Eliminar
                </button>
                <button
                  className="bg-[#2F374C] hover:bg-[#3c465f] text-white text-xs font-medium rounded px-3 py-1.5 w-[82px] h-[32px]"
                  onClick={() => console.log("Restaurar", archivo.id)}
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
    </div>
  );
}

export default ListaArchivosPapelera;
