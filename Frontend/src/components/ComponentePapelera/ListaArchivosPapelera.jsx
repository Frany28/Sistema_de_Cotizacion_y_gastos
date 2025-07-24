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
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom"; // ← navegación al detalle
import api from "../../api/index";

function ListaArchivosPapelera() {
  /*─────────────────── Estados ───────────────────*/
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [criterioOrden, setCriterioOrden] = useState("fechaDesc");

  /*─────────────────── Navegación ───────────────────*/
  const navigate = useNavigate();
  const irAlDetalle = (id) => navigate(`/gestor-archivos/archivo/${id}`);

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
    let indice = 0;
    let valor = bytes;
    while (valor >= 1024 && indice < unidades.length - 1) {
      valor /= 1024;
      indice += 1;
    }
    return `${valor.toFixed(indice ? 1 : 0)} ${unidades[indice]}`;
  };

  const iconoPorExtension = (ext) => {
    const e = ext?.toLowerCase();
    switch (e) {
      case "pdf":
      case "doc":
      case "docx":
      case "txt":
        return <FileText size={42} className="text-blue-400 mx-auto" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <IconoImagen size={42} className="text-purple-400 mx-auto" />;
      case "zip":
      case "rar":
        return <FileArchive size={42} className="text-yellow-500 mx-auto" />;
      case "mp3":
      case "wav":
        return <FileAudio size={42} className="text-green-400 mx-auto" />;
      case "mp4":
      case "avi":
        return <FileVideo size={42} className="text-red-400 mx-auto" />;
      default:
        return <FileWarning size={42} className="text-gray-400 mx-auto" />;
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
    let resultado = archivos.filter((archivo) =>
      archivo.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (filtroTipo !== "todos") {
      resultado = resultado.filter(
        (archivo) => categoriaPorExtension(archivo.extension) === filtroTipo
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

  /*─────────────────── Variantes de animación ───────────────────*/
  const varianteTarjeta = {
    oculto: { opacity: 0, y: 20 },
    visible: (indice) => ({
      opacity: 1,
      y: 0,
      transition: { delay: indice * 0.04 },
    }),
  };

  /*─────────────────── Render principal ───────────────────*/
  if (cargando) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 animate-pulse h-80 shadow-2xl" />
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-center text-gray-200 mb-6">
        Papelera de archivos
      </h1>
      <p className="text-center text-gray-400 mb-4">
        Aquí encontrarás los archivos que has eliminado recientemente. Puedes
        restaurarlos o eliminarlos definitivamente.
      </p>
      <section className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ──────────────── Grilla de archivos ──────────────── */}
        {archivosProcesados.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {archivosProcesados.map((archivo, indice) => (
              <motion.article
                key={archivo.id}
                custom={indice}
                variants={varianteTarjeta}
                initial="oculto"
                animate="visible"
                onClick={() => irAlDetalle(archivo.id)} // ← click navega
                className="cursor-pointer group bg-gradient-to-b from-gray-800/90 via-gray-850 to-gray-900/90 backdrop-blur-lg border border-gray-700/60 rounded-2xl shadow-xl flex flex-col justify-between px-6 py-5 text-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-gray-600/80"
              >
                {/* Icono + metadatos */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 bg-gray-700/60 rounded-full ring-1 ring-gray-600/40 group-hover:ring-indigo-500/50 transition-all">
                    {iconoPorExtension(archivo.extension)}
                  </div>
                  <h3 className="font-semibold text-lg leading-tight line-clamp-2 break-words group-hover:text-indigo-400 transition-colors">
                    {archivo.nombreOriginal}
                  </h3>
                  <div className="w-full space-y-1 mt-2 text-sm text-gray-300">
                    <p className="flex items-center justify-between">
                      <span className="font-medium text-gray-400">
                        Eliminado:
                      </span>
                      <span>{formatoFecha(archivo.actualizadoEn)}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="font-medium text-gray-400">Tamaño:</span>
                      <span>{formatoTamano(archivo.tamanioBytes)}</span>
                    </p>
                  </div>
                  <p
                    className="w-full text-xs text-left text-gray-500 truncate mt-2"
                    title={archivo.rutaOriginal || archivo.rutaS3 || "-"}
                  >
                    <span className="font-medium">Ruta:</span>{" "}
                    {archivo.rutaOriginal || archivo.rutaS3 || "-"}
                  </p>
                </div>

                {/* Botones */}
                <div className="flex justify-between gap-4 mt-6">
                  <button
                    className="flex-1 rounded-lg bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:brightness-110 active:scale-95 text-sm font-semibold py-2 shadow-sm hover:shadow-md transition-all"
                    onClick={(e) => {
                      e.stopPropagation(); // ← evita navegar
                      console.log("Eliminar definitivamente", archivo.id);
                    }}
                  >
                    Eliminar
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-gradient-to-r from-gray-600 via-gray-650 to-gray-700 hover:brightness-110 active:scale-95 text-sm font-semibold py-2 shadow-sm hover:shadow-md transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Restaurar", archivo.id);
                    }}
                  >
                    Restaurar
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center py-20 rounded-2xl bg-gradient-to-br from-gray-800/90 to-gray-900/90 ring-1 ring-gray-700/50 shadow-xl"
          >
            <h4 className="text-gray-400 text-xl font-semibold">
              {busqueda || filtroTipo !== "todos"
                ? "No se encontraron archivos que coincidan"
                : "La papelera está vacía"}
            </h4>
            <p className="text-gray-500 text-sm mt-3">
              {busqueda || filtroTipo !== "todos"
                ? "Prueba con otros términos de búsqueda o filtros"
                : "Los archivos eliminados aparecerán aquí"}
            </p>
          </motion.div>
        )}
      </section>
    </>
  );
}

export default ListaArchivosPapelera;
