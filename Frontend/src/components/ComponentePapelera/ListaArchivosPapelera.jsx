// src/pages/Drive/ListaArchivosPapelera.jsx
import { useEffect, useState, useMemo } from "react";
import ModalConfirmacion from "../../components/Modals/ModalConfirmacion";
import ModalExito from "../../components/Modals/ModalExito";
import ModalError from "../../components/Modals/ModalError";

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
import { useNavigate } from "react-router-dom";
import api from "../../api";

function ListaArchivosPapelera() {
  /*─────────────────── Estados ───────────────────*/
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [criterioOrden, setCriterioOrden] = useState("fechaDesc");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mostrarError, setMostrarError] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const [archivoAEliminar, setArchivoAEliminar] = useState(null);

  /*─────────────────── Hooks ───────────────────*/
  const navigate = useNavigate();

  const confirmarRestauracion = (archivo) => {
    setArchivoSeleccionado(archivo);
    setMostrarConfirmacion(true);
  };

  const ejecutarRestauracion = async () => {
    try {
      const { data } = await api.post(
        `/archivos/${archivoSeleccionado.id}/restaurar`,
        {},
        { withCredentials: true }
      );
      setMensajeExito(data.mensaje || "Archivo restaurado correctamente.");
      setMostrarExito(true);

      // Quitar archivo restaurado de la lista
      setArchivos((prev) =>
        prev.filter((a) => a.id !== archivoSeleccionado.id)
      );
    } catch (error) {
      console.error("Error al restaurar:", error);
      setMensajeError(
        error?.response?.data?.mensaje ||
          "No se pudo restaurar el archivo. Intenta más tarde."
      );
      setMostrarError(true);
    } finally {
      setMostrarConfirmacion(false);
      setArchivoSeleccionado(null);
    }
  };

  const confirmarEliminacion = (archivo) => {
    setArchivoAEliminar(archivo);
    setMostrarConfirmEliminar(true);
  };

  const ejecutarEliminacion = async () => {
    try {
      const { data } = await api.delete(
        `/archivos/papelera/${archivoAEliminar.id}`,
        { withCredentials: true }
      );
      setMensajeExito(data.message || "Archivo eliminado permanentemente.");
      setMostrarExito(true);

      // Quitar de la lista
      setArchivos((prev) => prev.filter((a) => a.id !== archivoAEliminar.id));
    } catch (error) {
      console.error("Error al eliminar:", error);
      setMensajeError(
        error?.response?.data?.message ||
          "No se pudo eliminar el archivo. Intenta más tarde."
      );
      setMostrarError(true);
    } finally {
      setMostrarConfirmEliminar(false);
      setArchivoAEliminar(null);
    }
  };

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
      indice = 1;
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
        return <IconoImagen size={42} className="text-blue-600 mx-auto" />;
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

  /*─────────────────── Búsqueda  Filtro  Orden ───────────────────*/
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

  /*─────────────────── Navegación al detalle ───────────────────*/
  const irADetalle = (id) => {
    navigate(`/gestor-archivos/archivo/${id}`);
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
        {/* ──────────────── Barra de herramientas ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-800 to-gray-900/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-gray-700/50 px-6 py-4"
        >
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
              className="w-full bg-gray-700/60 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-10 pr-4 py-2.5 placeholder-gray-400 transition-all duration-200 hover:bg-gray-600/60 focus:bg-gray-600/70"
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
                  className="appearance-none bg-gray-700/60 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-2.5 hover:bg-gray-600/60 transition-all cursor-pointer backdrop-blur"
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
                  className="appearance-none bg-gray-700/60 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-2.5 hover:bg-gray-600/60 transition-all cursor-pointer backdrop-blur"
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
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white text-sm font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50 transition-transform shadow hover:shadow-xl disabled:cursor-not-allowed"
              disabled={archivos.length === 0}
              onClick={() => console.log("Vaciar papelera (por implementar)")}
            >
              <Trash2 size={16} /> Vaciar papelera
            </button>
          </div>
        </motion.div>

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
                role="button"
                tabIndex={0}
                onClick={() => irADetalle(archivo.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    irADetalle(archivo.id);
                }}
                className="group bg-gradient-to-b from-gray-800/90 via-gray-850 to-gray-900/90 backdrop-blur-lg border border-gray-700/60 rounded-2xl shadow-xl flex flex-col justify-between px-6 py-5 text-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-gray-600/80 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {/* Icono  metadatos */}
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
                      e.stopPropagation();
                      console.log("Eliminar definitivamente", archivo.id);
                    }}
                  >
                    Eliminar
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-gradient-to-r from-gray-600 via-gray-650 to-gray-700 hover:brightness-110 active:scale-95 text-sm font-semibold py-2 shadow-sm hover:shadow-md transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmarRestauracion(archivo);
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
      </section>{" "}
      <ModalConfirmacion
        visible={mostrarConfirmacion}
        onClose={() => setMostrarConfirmacion(false)}
        onConfirmar={ejecutarRestauracion}
        titulo="¿Restaurar archivo?"
        mensaje={`¿Estás seguro de restaurar "${archivoSeleccionado?.nombreOriginal}"?`}
        textoConfirmar="Sí, restaurar"
      />
      <ModalExito
        visible={mostrarExito}
        onClose={() => setMostrarExito(false)}
        mensaje={mensajeExito}
      />
      <ModalError
        visible={mostrarError}
        onClose={() => setMostrarError(false)}
        mensaje={mensajeError}
      />
      <ModalConfirmacion
        visible={mostrarConfirmEliminar}
        onClose={() => setMostrarConfirmEliminar(false)}
        onConfirmar={ejecutarEliminacion}
        titulo="¿Eliminar definitivamente?"
        mensaje={`Esta acción borrará "${archivoAEliminar?.nombreOriginal}" de forma permanente.`}
        textoConfirmar="Sí, eliminar"
      />
    </>
  );
}

export default ListaArchivosPapelera;
