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
  RotateCcw,
  ChevronDown,
  X,
  HardDrive,
  Folder,
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
      : format(date, "dd MMM yyyy, HH:mm", { locale: es });
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
        return <FileText size={40} className="text-red-500 mx-auto" />;
      case "doc":
      case "docx":
        return <FileText size={40} className="text-blue-500 mx-auto" />;
      case "txt":
        return <FileText size={40} className="text-gray-400 mx-auto" />;
      case "jpg":
      case "jpeg":
        return <IconoImagen size={40} className="text-emerald-500 mx-auto" />;
      case "png":
        return <IconoImagen size={40} className="text-amber-500 mx-auto" />;
      case "gif":
        return <IconoImagen size={40} className="text-purple-500 mx-auto" />;
      case "zip":
      case "rar":
        return <FileArchive size={40} className="text-yellow-500 mx-auto" />;
      case "mp3":
      case "wav":
        return <FileAudio size={40} className="text-pink-500 mx-auto" />;
      case "mp4":
      case "avi":
        return <FileVideo size={40} className="text-indigo-500 mx-auto" />;
      default:
        return <FileWarning size={40} className="text-gray-500 mx-auto" />;
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
      <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 animate-pulse h-96 shadow-lg">
        <div className="h-10 bg-gray-700 rounded mb-6 w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl h-80"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ──────────────── Header ──────────────── */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trash2 size={24} className="text-red-500" />
            <h1 className="text-2xl font-bold text-white">
              Papelera de reciclaje
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"}
          </div>
        </div>

        <div className="border-b border-gray-700"></div>
      </div>

      {/* ──────────────── Barra de herramientas ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Barra de búsqueda */}
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar en la papelera..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block pl-10 pr-4 py-2.5 placeholder-gray-400 transition-all"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 flex-wrap">
          {/* Contenedor de filtros */}
          <div className="flex gap-2">
            {/* Filtro por tipo */}
            <div className="relative group">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-gray-700 transition-all cursor-pointer"
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
                <ChevronDown className="text-gray-400" size={16} />
              </div>
            </div>

            {/* Ordenar por */}
            <div className="relative group">
              <select
                value={criterioOrden}
                onChange={(e) => setCriterioOrden(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-gray-700 transition-all cursor-pointer"
              >
                <option value="fechaDesc">Más recientes</option>
                <option value="nombreAsc">Nombre (A-Z)</option>
                <option value="nombreDesc">Nombre (Z-A)</option>
                <option value="tamanoDesc">Tamaño (↓)</option>
                <option value="tamanoAsc">Tamaño (↑)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {/* Vaciar papelera */}
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-50 transition-all shadow-md disabled:cursor-not-allowed"
            disabled={archivos.length === 0}
            onClick={() => console.log("Vaciar papelera (por implementar)")}
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Vaciar papelera</span>
            <span className="inline sm:hidden">Vaciar</span>
          </button>
        </div>
      </div>

      {/* ──────────────── Grilla de archivos ──────────────── */}
      {archivosProcesados.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {archivosProcesados.map((archivo) => (
            <div
              key={archivo.id}
              className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between p-5 text-white transition-all hover:shadow-xl hover:border-gray-600 hover:-translate-y-1 group"
            >
              {/* Icono + metadatos */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  {iconoPorExtension(archivo.extension)}
                  <div className="absolute -bottom-1 -right-1 bg-gray-700 rounded-full p-1 border border-gray-600">
                    {archivo.rutaS3?.includes("folder") ? (
                      <Folder size={14} className="text-blue-400" />
                    ) : (
                      <HardDrive size={14} className="text-green-400" />
                    )}
                  </div>
                </div>
                <p className="font-semibold text-lg leading-tight line-clamp-2 break-words">
                  {archivo.nombreOriginal}
                </p>
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Tamaño:</span>
                    <span className="text-gray-300">
                      {formatoTamano(archivo.tamanioBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Eliminado:</span>
                    <span className="text-gray-300">
                      {formatoFecha(archivo.actualizadoEn)}
                    </span>
                  </div>
                </div>
                {archivo.rutaOriginal && (
                  <p
                    className="text-xs text-gray-500 mt-1 break-all w-full truncate text-left"
                    title={archivo.rutaOriginal}
                  >
                    <span className="text-gray-400">Original: </span>
                    {archivo.rutaOriginal}
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-between gap-3 mt-5">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-3 py-2 transition-all"
                  onClick={() =>
                    console.log("Eliminar definitivamente", archivo.id)
                  }
                >
                  <X size={16} />
                  <span>Eliminar</span>
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-3 py-2 transition-all"
                  onClick={() => console.log("Restaurar", archivo.id)}
                >
                  <RotateCcw size={16} />
                  <span>Restaurar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Trash2 size={48} className="text-gray-600" />
          <h3 className="text-xl font-medium text-gray-300">
            {busqueda || filtroTipo !== "todos"
              ? "No se encontraron archivos"
              : "La papelera está vacía"}
          </h3>
          <p className="text-gray-500 max-w-md">
            {busqueda || filtroTipo !== "todos"
              ? "No hay archivos que coincidan con tu búsqueda o filtros."
              : "Los archivos que elimines aparecerán aquí."}
          </p>
          {(busqueda || filtroTipo !== "todos") && (
            <button
              onClick={() => {
                setBusqueda("");
                setFiltroTipo("todos");
              }}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 mt-2"
            >
              <span>Limpiar filtros</span>
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ListaArchivosPapelera;
