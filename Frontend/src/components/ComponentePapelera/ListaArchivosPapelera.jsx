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
  Filter,
  ListFilter,
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
      : format(date, "dd MMM yyyy", { locale: es });
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
        return <FileText size={40} className="text-blue-400 mx-auto" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <IconoImagen size={40} className="text-purple-400 mx-auto" />;
      case "zip":
      case "rar":
        return <FileArchive size={40} className="text-yellow-500 mx-auto" />;
      case "mp3":
      case "wav":
        return <FileAudio size={40} className="text-green-400 mx-auto" />;
      case "mp4":
      case "avi":
        return <FileVideo size={40} className="text-red-400 mx-auto" />;
      default:
        return <FileWarning size={40} className="text-gray-400 mx-auto" />;
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
      <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 animate-pulse h-64 shadow-lg" />
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ──────────────── Barra de herramientas ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg">
        {/* Barra de búsqueda */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar archivo en la papelera..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 pr-4 py-2.5 placeholder-gray-400 transition-all duration-200 hover:bg-gray-600 focus:bg-gray-600"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 flex-wrap justify-end">
          {/* Contenedor de filtros */}
          <div className="flex gap-3">
            {/* Filtro por tipo */}
            <div className="relative group">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="appearance-none bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-gray-600 transition-all cursor-pointer"
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
            <div className="relative group">
              <select
                value={criterioOrden}
                onChange={(e) => setCriterioOrden(e.target.value)}
                className="appearance-none bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-gray-600 transition-all cursor-pointer"
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

          {/* Vaciar papelera */}
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-60 transition-all shadow hover:shadow-lg disabled:cursor-not-allowed"
            disabled={archivos.length === 0}
            onClick={() => console.log("Vaciar papelera (por implementar)")}
          >
            <Trash2 size={16} /> Vaciar papelera
          </button>
        </div>
      </div>

      {/* ──────────────── Grilla de archivos ──────────────── */}
      {archivosProcesados.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {archivosProcesados.map((archivo) => (
            <div
              key={archivo.id}
              className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl h-full w-full border border-gray-700 shadow-lg flex flex-col justify-between px-5 py-4 text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-gray-600"
            >
              {/* Icono + metadatos */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-gray-700 rounded-full mb-2">
                  {iconoPorExtension(archivo.extension)}
                </div>
                <p className="font-semibold text-lg leading-tight line-clamp-2 break-words">
                  {archivo.nombreOriginal}
                </p>
                <div className="w-full space-y-1 mt-2">
                  <p className="text-sm text-gray-400 flex justify-between">
                    <span className="font-medium">Eliminado:</span>
                    <span>{formatoFecha(archivo.actualizadoEn)}</span>
                  </p>
                  <p className="text-sm text-gray-400 flex justify-between">
                    <span className="font-medium">Tamaño:</span>
                    <span>{formatoTamano(archivo.tamanioBytes)}</span>
                  </p>
                </div>
                <div className="w-full mt-2">
                  <p
                    className="text-xs text-gray-500 text-left truncate"
                    title={archivo.rutaOriginal || archivo.rutaS3 || "-"}
                  >
                    <span className="font-medium">Ruta:</span>{" "}
                    {archivo.rutaOriginal || archivo.rutaS3 || "-"}
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-between gap-3 mt-5">
                <button
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-lg px-3 py-2 flex-1 transition-all shadow hover:shadow-md"
                  onClick={() =>
                    console.log("Eliminar definitivamente", archivo.id)
                  }
                >
                  Eliminar
                </button>
                <button
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white text-sm font-medium rounded-lg px-3 py-2 flex-1 transition-all shadow hover:shadow-md"
                  onClick={() => console.log("Restaurar", archivo.id)}
                >
                  Restaurar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="col-span-full text-center py-16 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
          <div className="text-gray-400 text-lg font-medium">
            {busqueda || filtroTipo !== "todos"
              ? "No se encontraron archivos que coincidan"
              : "La papelera está vacía"}
          </div>
          <p className="text-gray-500 text-sm mt-2">
            {busqueda || filtroTipo !== "todos"
              ? "Prueba con otros términos de búsqueda o filtros"
              : "Los archivos eliminados aparecerán aquí"}
          </p>
        </div>
      )}
    </div>
  );
}

export default ListaArchivosPapelera;
