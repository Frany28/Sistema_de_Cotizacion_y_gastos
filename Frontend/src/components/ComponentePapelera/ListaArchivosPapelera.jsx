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
  const [filtroTipo, setFiltroTipo] = useState("todos"); // doc | img | audio | video | zip | otros
  const [criterioOrden, setCriterioOrden] = useState("fechaDesc"); // nombreAsc|nombreDesc|fechaDesc|tamanoDesc|tamanoAsc

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
    /** 1. Filtrar por texto de búsqueda */
    let resultado = archivos.filter((a) =>
      a.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
    );

    /** 2. Filtrar por tipo (si aplica) */
    if (filtroTipo !== "todos") {
      resultado = resultado.filter(
        (a) => categoriaPorExtension(a.extension) === filtroTipo
      );
    }

    /** 3. Clasificar según criterio */
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
    <div className="p-6 space-y-6">
      {/* ──────────────── Barra de herramientas ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
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
            className="w-full bg-[#2F374C] border border-[#3c465f] text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 pr-4 py-2.5 placeholder-gray-400"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 flex-wrap">
          {/* Vaciar papelera */}
          <button
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-60 transition-colors"
            disabled={archivos.length === 0}
            onClick={() => console.log("Vaciar papelera (por implementar)")}
          >
            <Trash2 size={16} /> Vaciar papelera
          </button>

          {/* Contenedor de filtros */}
          <div className="flex gap-2">
            {/* Filtro por tipo */}
            <div className="relative">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="appearance-none bg-[#2F374C] border border-[#3c465f] text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-[#3c465f] transition-colors cursor-pointer"
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
            <div className="relative">
              <select
                value={criterioOrden}
                onChange={(e) => setCriterioOrden(e.target.value)}
                className="appearance-none bg-[#2F374C] border border-[#3c465f] text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 hover:bg-[#3c465f] transition-colors cursor-pointer"
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
        </div>
      </div>

      {/* ──────────────── Grilla de archivos ──────────────── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-6 justify-center">
        {archivosProcesados.length ? (
          archivosProcesados.map((archivo) => (
            <div
              key={archivo.id}
              className="bg-[#1C2434] rounded-2xl h-[308px] w-[236px] border border-[#2F374C] shadow flex flex-col justify-between px-5 py-4 text-white transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Icono + metadatos */}
              <div className="flex flex-col items-center text-center gap-2">
                {iconoPorExtension(archivo.extension)}
                <p className="font-semibold text-lg leading-tight line-clamp-2 break-words">
                  {archivo.nombreOriginal}
                </p>
                <p className="text-sm text-gray-400">
                  Eliminado: {formatoFecha(archivo.actualizadoEn)}
                </p>
                <p className="text-sm text-gray-400">
                  Tamaño: {formatoTamano(archivo.tamanioBytes)}
                </p>
                <p className="text-xs text-gray-500 mt-1 break-all">
                  Ruta Original:
                  <br />
                  {archivo.rutaOriginal || archivo.rutaS3 || "-"}
                </p>
              </div>

              {/* Botones */}
              <div className="flex justify-between gap-2 mt-4">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md px-4 py-2 w-[100px]"
                  onClick={() =>
                    console.log("Eliminar definitivamente", archivo.id)
                  }
                >
                  Eliminar
                </button>
                <button
                  className="bg-[#2F374C] hover:bg-[#3c465f] text-white text-sm font-medium rounded-md px-4 py-2 w-[100px]"
                  onClick={() => console.log("Restaurar", archivo.id)}
                >
                  Restaurar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-16 text-sm">
            {busqueda || filtroTipo !== "todos"
              ? "No se encontraron archivos que coincidan"
              : "No hay archivos en la papelera"}
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaArchivosPapelera;
