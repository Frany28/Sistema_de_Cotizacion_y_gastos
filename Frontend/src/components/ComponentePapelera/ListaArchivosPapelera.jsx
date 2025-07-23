// src/pages/Drive/ListaArchivosPapelera.jsx
import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  FileArchive,
  FileAudio,
  FileVideo,
  Image as IconoImagen,
  FileWarning,
  Search,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../api";

function ListaArchivosPapelera() {
  /*─────────────────── Estados ───────────────────*/
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [criterioOrden, setCriterioOrden] = useState("fechaDesc");

  /*─────────────────── Cargar archivos ───────────────────*/
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

  /*─────────────────── Utilidades ───────────────────*/
  const formatoFecha = (fecha) => {
    const date = new Date(fecha);
    return isNaN(date.getTime())
      ? "-"
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
      case "doc":
      case "docx":
      case "txt":
        return <FileText size={34} className="text-gray-300 mx-auto" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <IconoImagen size={34} className="text-blue-400 mx-auto" />;
      case "zip":
      case "rar":
        return <FileArchive size={34} className="text-yellow-500 mx-auto" />;
      case "mp3":
      case "wav":
        return <FileAudio size={34} className="text-yellow-300 mx-auto" />;
      case "mp4":
      case "avi":
        return <FileVideo size={34} className="text-purple-400 mx-auto" />;
      default:
        return <FileWarning size={34} className="text-gray-400 mx-auto" />;
    }
  };

  const categoriaPorExtension = (ext) => {
    const e = ext?.toLowerCase();
    if (["pdf", "doc", "docx", "txt"].includes(e)) return "doc";
    if (["jpg", "jpeg", "png", "gif"].includes(e)) return "img";
    if (["mp3", "wav"].includes(e)) return "audio";
    if (["mp4", "avi"].includes(e)) return "video";
    if (["zip", "rar"].includes(e)) return "zip";
    return "otros";
  };

  /*─────────────────── Búsqueda + Filtro + Orden ───────────────────*/
  const archivosProcesados = useMemo(() => {
    let resultado = archivos.filter((a) =>
      a.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (filtroTipo !== "todos") {
      resultado = resultado.filter(
        (a) => categoriaPorExtension(a.extension) === filtroTipo
      );
    }

    resultado.sort((a, b) => {
      switch (criterioOrden) {
        case "nombreAsc":
          return a.nombreOriginal.localeCompare(b.nombreOriginal);
        case "nombreDesc":
          return b.nombreOriginal.localeCompare(a.nombreOriginal);
        case "tamanoAsc":
          return a.tamanioBytes - b.tamanioBytes;
        case "tamanoDesc":
          return b.tamanioBytes - a.tamanioBytes;
        case "fechaDesc":
        default:
          return new Date(b.actualizadoEn) - new Date(a.actualizadoEn);
      }
    });

    return resultado;
  }, [archivos, busqueda, filtroTipo, criterioOrden]);

  /*─────────────────── Render principal ───────────────────*/
  if (cargando) {
    return (
      <div className="w-full bg-[#1C2434] rounded-2xl p-4 animate-pulse h-64 shadow" />
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ──────────────── Header ──────────────── */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trash2 size={24} className="text-red-400" />
              Papelera de reciclaje
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {archivos.length} archivos • Eliminados después de 30 días
            </p>
          </div>
          <button
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-60 transition-colors whitespace-nowrap shadow-lg hover:shadow-red-800/30"
            disabled={archivos.length === 0}
            onClick={() => console.log("Vaciar papelera")}
          >
            <Trash2 size={16} />
            Vaciar papelera
          </button>
        </div>
      </div>

      {/* ──────────────── Barra de herramientas ──────────────── */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#1C2434] p-4 rounded-xl border border-[#2F374C] shadow-inner">
        {/* Barra de búsqueda con efecto glass */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar en la papelera..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#2F374C]/70 backdrop-blur-sm border border-[#3c465f] text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block pl-10 pr-4 py-2.5 placeholder-gray-400 transition-all duration-200"
          />
        </div>

        {/* Controles de filtro y orden */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtro por tipo */}
          <div className="relative group min-w-[160px]">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="appearance-none bg-[#2F374C]/70 backdrop-blur-sm border border-[#3c465f] text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-[#3c465f]/70 transition-all cursor-pointer shadow-sm"
            >
              <option value="todos">Todos los tipos</option>
              <option value="doc">Documentos</option>
              <option value="img">Imágenes</option>
              <option value="audio">Audios</option>
              <option value="video">Videos</option>
              <option value="zip">Comprimidos</option>
              <option value="otros">Otros</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown
                className="text-gray-400 group-hover:text-white transition-colors"
                size={16}
              />
            </div>
          </div>

          {/* Ordenar por */}
          <div className="relative group min-w-[160px]">
            <select
              value={criterioOrden}
              onChange={(e) => setCriterioOrden(e.target.value)}
              className="appearance-none bg-[#2F374C]/70 backdrop-blur-sm border border-[#3c465f] text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-[#3c465f]/70 transition-all cursor-pointer shadow-sm"
            >
              <option value="fechaDesc">Más recientes</option>
              <option value="nombreAsc">Nombre (A-Z)</option>
              <option value="nombreDesc">Nombre (Z-A)</option>
              <option value="tamanoDesc">Tamaño (↓)</option>
              <option value="tamanoAsc">Tamaño (↑)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown
                className="text-gray-400 group-hover:text-white transition-colors"
                size={16}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── Grilla de archivos ──────────────── */}
      {archivosProcesados.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {archivosProcesados.map((archivo) => (
            <div
              key={archivo.id}
              className="bg-[#1C2434] rounded-xl border border-[#2F374C] shadow hover:shadow-lg transition-all hover:border-blue-500/30 flex flex-col"
            >
              {/* Contenido de la tarjeta */}
              <div className="p-4 flex flex-col items-center text-center gap-3 flex-grow">
                {iconoPorExtension(archivo.extension)}
                <div className="w-full">
                  <h3 className="font-semibold text-base leading-tight line-clamp-2 break-words">
                    {archivo.nombreOriginal}
                  </h3>
                  <div className="mt-2 space-y-1 text-xs text-gray-400">
                    <p>Eliminado: {formatoFecha(archivo.actualizadoEn)}</p>
                    <p>Tamaño: {formatoTamano(archivo.tamanioBytes)}</p>
                    <p className="text-gray-500 truncate">
                      {archivo.rutaOriginal || archivo.rutaS3 || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="p-3 bg-[#2F374C] rounded-b-xl flex justify-between gap-2">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded px-3 py-2 flex-1 transition-colors"
                  onClick={() =>
                    console.log("Eliminar definitivamente", archivo.id)
                  }
                >
                  Eliminar
                </button>
                <button
                  className="bg-[#3c465f] hover:bg-[#4a5568] text-white text-xs font-medium rounded px-3 py-2 flex-1 transition-colors"
                  onClick={() => console.log("Restaurar", archivo.id)}
                >
                  Restaurar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1C2434] rounded-xl border border-[#2F374C] p-8 text-center">
          <p className="text-gray-400 text-sm">
            {busqueda || filtroTipo !== "todos"
              ? "No se encontraron archivos que coincidan con tu búsqueda"
              : "La papelera está vacía"}
          </p>
        </div>
      )}
    </div>
  );
}

export default ListaArchivosPapelera;
