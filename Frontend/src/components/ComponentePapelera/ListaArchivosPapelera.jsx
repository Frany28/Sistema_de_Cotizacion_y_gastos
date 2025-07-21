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
      : format(date, "PPP", { locale: es });
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
    <div className="w-full bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      {/* Barra de búsqueda y orden */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 pb-3 bg-gray-800 border-b border-gray-700">
        <input
          type="text"
          placeholder="Buscar en papelera..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full sm:w-80 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
        />
        <div className="flex gap-2 text-sm text-gray-300">
          <button
            onClick={() =>
              setOrden((o) => ({
                campo: "nombreOriginal",
                asc: o.campo === "nombreOriginal" ? !o.asc : true,
              }))
            }
            className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-colors duration-200 ${
              orden.campo === "nombreOriginal"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-gray-700/50 border border-gray-600"
            }`}
          >
            Nombre {orden.campo === "nombreOriginal" && (orden.asc ? "↑" : "↓")}
          </button>
          <button
            onClick={() =>
              setOrden((o) => ({
                campo: "actualizadoEn",
                asc: o.campo === "actualizadoEn" ? !o.asc : false,
              }))
            }
            className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-colors duration-200 ${
              orden.campo === "actualizadoEn"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-gray-700/50 border border-gray-600"
            }`}
          >
            Fecha {orden.campo === "actualizadoEn" && (orden.asc ? "↑" : "↓")}
          </button>
          <button
            onClick={() =>
              setOrden((o) => ({
                campo: "tamanioBytes",
                asc: o.campo === "tamanioBytes" ? !o.asc : false,
              }))
            }
            className={`px-3 py-2 rounded-lg flex items-center gap-1 transition-colors duration-200 ${
              orden.campo === "tamanioBytes"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-gray-700/50 border border-gray-600"
            }`}
          >
            Tamaño {orden.campo === "tamanioBytes" && (orden.asc ? "↑" : "↓")}
          </button>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
        <table className="min-w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-700 backdrop-blur-sm z-10 border-b border-gray-600">
            <tr className="text-gray-300 font-medium">
              <th className="py-3.5 pl-6 text-base font-semibold text-gray-200">
                Nombre
              </th>
              <th className="py-3.5 w-56 text-base font-semibold text-gray-200">
                Eliminado
              </th>
              <th className="py-3.5 w-32 pr-6 text-right text-base font-semibold text-gray-200">
                Tamaño
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {archivosFiltrados.length > 0 ? (
              archivosFiltrados.map((a) => (
                <tr
                  key={a.id}
                  className="hover:bg-gray-700/40 transition-colors duration-200 cursor-pointer group"
                >
                  <td className="py-3 flex items-center gap-2 text-gray-100 group-hover:text-white pl-6">
                    {iconoPorExtension(a.extension)}
                    <span className="truncate max-w-[24rem]">
                      {a.nombreOriginal}
                    </span>
                  </td>
                  <td className="text-sm text-gray-300 whitespace-nowrap group-hover:text-gray-100">
                    {formatoFecha(a.actualizadoEn)}
                  </td>
                  <td className="text-sm text-gray-300 pr-6 text-right group-hover:text-gray-100">
                    {formatoTamano(a.tamanioBytes)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-12 text-center text-gray-400">
                  {busqueda
                    ? "No se encontraron resultados para tu búsqueda"
                    : "No hay archivos en papelera"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ListaArchivosPapelera;
