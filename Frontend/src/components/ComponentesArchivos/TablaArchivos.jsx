import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FileArchive,
  Image as IconoImagen,
  FileAudio,
  FileVideo,
  FileWarning,
  Upload,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import api from "././api/index";
import { useNavigate } from "react-router-dom";

function TablaArchivos() {
  /* ----------------------------------------------------------------------- */
  /* Estado                                                                  */
  /* ----------------------------------------------------------------------- */
  const [arbolArchivos, setArbolArchivos] = useState([]);
  const [nodosExpandidos, setNodosExpandidos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [orden, setOrden] = useState({ campo: "nombre", asc: true });

  // Modal subida
  const [modalSubidaAbierto, setModalSubidaAbierto] = useState(false);
  const [estaArrastrando, setEstaArrastrando] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [mensajeErrorSubida, setMensajeErrorSubida] = useState("");

  const inputArchivoRef = useRef(null);

  /* ----------------------------------------------------------------------- */
  /* Obtención de datos                                                      */
  /* ----------------------------------------------------------------------- */
  const obtenerArbolArchivos = useCallback(async () => {
    try {
      const { data } = await api.get("/archivos/arbol", {
        withCredentials: true,
      });
      setArbolArchivos(Array.isArray(data) ? data : Object.values(data || {}));
    } catch (error) {
      console.error("Error al traer árbol de archivos", error);
      setArbolArchivos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const navegar = useNavigate();

  useEffect(() => {
    obtenerArbolArchivos();
  }, [obtenerArbolArchivos]);

  /* ----------------------------------------------------------------------- */
  /* Helpers                                                                 */
  /* ----------------------------------------------------------------------- */
  const formatoFecha = (fecha) => {
    if (!fecha) return "-";

    const date = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(date.getTime())) return "-";

    const horasDesde = (Date.now() - date) / 3_600_000;
    return horasDesde < 48
      ? formatDistanceToNowStrict(date, { locale: es, addSuffix: true })
      : format(date, "LLL dd, yyyy", { locale: es });
  };

  const formatoTamano = (bytes) => {
    if (bytes == null || bytes === 0) return "-";
    const unidades = ["B", "KB", "MB", "GB", "TB"];
    let indice = 0;
    let valor = bytes;
    while (valor >= 1024 && indice < unidades.length - 1) {
      valor /= 1024;
      indice++;
    }
    return `${valor.toFixed(indice ? 1 : 0)} ${unidades[indice]}`;
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

  // ✅ FIX 1: antes estaba ({ .prev, ... })
  const alternarNodo = (ruta) =>
    setNodosExpandidos((prev) => ({ ...prev, [ruta]: !prev[ruta] }));

  const coincideBusqueda = (cadena) =>
    cadena.toLowerCase().includes(terminoBusqueda.trim().toLowerCase());

  /* ----------------------------------------------------------------------- */
  /* Subida de archivos (repositorio general)                                */
  /* ----------------------------------------------------------------------- */
  const abrirModalSubida = () => {
    setMensajeErrorSubida("");
    setArchivoSeleccionado(null);
    setEstaArrastrando(false);
    setModalSubidaAbierto(true);
  };

  const cerrarModalSubida = () => {
    if (subiendoArchivo) return;
    setModalSubidaAbierto(false);
  };

  const onSeleccionarArchivo = (file) => {
    if (!file) return;
    setMensajeErrorSubida("");
    setArchivoSeleccionado(file);
  };

  const onDropArchivo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEstaArrastrando(false);

    const file = e.dataTransfer?.files?.[0];
    onSeleccionarArchivo(file);
  };

  const subirArchivoAlRepositorio = async () => {
    if (!archivoSeleccionado) {
      setMensajeErrorSubida("Selecciona un archivo antes de subir.");
      return;
    }

    setSubiendoArchivo(true);
    setMensajeErrorSubida("");

    try {
      const formData = new FormData();
      formData.append("archivo", archivoSeleccionado);

      // Endpoint existente: POST /archivos/repositorio
      await api.post("/archivos/repositorio", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setModalSubidaAbierto(false);
      await obtenerArbolArchivos();
    } catch (error) {
      console.error("Error subiendo archivo:", error);
      setMensajeErrorSubida(
        error?.response?.data?.message ||
          "No se pudo subir el archivo. Revisa permisos o el backend.",
      );
    } finally {
      setSubiendoArchivo(false);
    }
  };

  /* ----------------------------------------------------------------------- */
  /* Cálculos para carpetas                                                  */
  /* ----------------------------------------------------------------------- */
  const calcularTamanoCarpeta = useCallback((carpeta) => {
    if (!carpeta.hijos || !Array.isArray(carpeta.hijos)) return 0;

    return carpeta.hijos.reduce((total, hijo) => {
      if (hijo.tipo === "archivo") {
        return total + (hijo.tamanioBytes || 0);
      } else if (hijo.tipo === "carpeta") {
        return total + calcularTamanoCarpeta(hijo);
      }
      return total;
    }, 0);
  }, []);

  const obtenerUltimaModificacion = useCallback((carpeta) => {
    if (!carpeta.hijos || !Array.isArray(carpeta.hijos)) return null;

    let ultimaFecha = new Date(carpeta.creadoEn);
    if (isNaN(ultimaFecha.getTime())) ultimaFecha = new Date(0);

    carpeta.hijos.forEach((hijo) => {
      let fechaHijo;

      if (hijo.tipo === "carpeta") {
        const fechaSubcarpeta = obtenerUltimaModificacion(hijo);
        if (fechaSubcarpeta && !isNaN(fechaSubcarpeta.getTime())) {
          fechaHijo = fechaSubcarpeta;
        }
      } else {
        fechaHijo = new Date(hijo.creadoEn);
      }

      if (fechaHijo && !isNaN(fechaHijo.getTime()) && fechaHijo > ultimaFecha) {
        ultimaFecha = fechaHijo;
      }
    });

    return isNaN(ultimaFecha.getTime()) ? null : ultimaFecha;
  }, []);

  /* ----------------------------------------------------------------------- */
  /* Ordenación                                                              */
  /* ----------------------------------------------------------------------- */
  const ordenar = useCallback(
    (a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "carpeta" ? -1 : 1;
      const factor = orden.asc ? 1 : -1;

      switch (orden.campo) {
        case "tamanioBytes": {
          const tamanoA =
            a.tipo === "carpeta"
              ? calcularTamanoCarpeta(a)
              : a.tamanioBytes || 0;
          const tamanoB =
            b.tipo === "carpeta"
              ? calcularTamanoCarpeta(b)
              : b.tamanioBytes || 0;
          return factor * (tamanoA - tamanoB);
        }
        case "creadoEn": {
          const fechaA =
            a.tipo === "carpeta"
              ? obtenerUltimaModificacion(a)
              : new Date(a.creadoEn);
          const fechaB =
            b.tipo === "carpeta"
              ? obtenerUltimaModificacion(b)
              : new Date(b.creadoEn);
          return factor * (fechaA - fechaB);
        }
        default:
          return factor * a.nombre.localeCompare(b.nombre);
      }
    },
    [orden, calcularTamanoCarpeta, obtenerUltimaModificacion],
  );

  /* ----------------------------------------------------------------------- */
  /* Render recursivo                                                        */
  /* ----------------------------------------------------------------------- */
  const renderizarNodo = useCallback(
    (nodo, nivel = 0) => {
      const tieneCoincidencia = coincideBusqueda(nodo.nombre);

      if (terminoBusqueda && nodo.tipo === "archivo" && !tieneCoincidencia) {
        return [];
      }

      const sangriaPx = 16 + nivel * 24;

      if (nodo.tipo === "carpeta") {
        const hijosFiltrados = (Array.isArray(nodo.hijos) ? nodo.hijos : [])
          .sort(ordenar)
          .flatMap((h) => renderizarNodo(h, nivel + 1));

        const tieneHijosCoincidentes = hijosFiltrados.length > 0;

        if (terminoBusqueda && !tieneCoincidencia && !tieneHijosCoincidentes) {
          return [];
        }

        const abierta = !!nodosExpandidos[nodo.ruta] || terminoBusqueda;

        const tamanoCarpeta = calcularTamanoCarpeta(nodo);
        const ultimaModificacion = obtenerUltimaModificacion(nodo);

        const filaCarpeta = (
          <tr
            key={nodo.ruta}
            className="cursor-pointer hover:bg-gray-700/50 transition-colors duration-200 select-none group"
            onClick={() => alternarNodo(nodo.ruta)}
          >
            <td
              className="py-3 flex items-center gap-2 font-medium text-gray-50 group-hover:text-white"
              style={{ paddingLeft: sangriaPx }}
            >
              {abierta ? (
                <ChevronDown size={16} className="text-blue-400" />
              ) : (
                <ChevronRight
                  size={16}
                  className="text-gray-400 group-hover:text-gray-300"
                />
              )}
              <Folder size={18} className="text-blue-400 flex-shrink-0" />
              <span className="truncate max-w-[12rem] sm:max-w-[24rem]">
                {nodo.nombre.replace(/_/g, " ")}
              </span>
            </td>
            <td className="text-sm text-gray-300 whitespace-nowrap group-hover:text-gray-100 hidden sm:table-cell">
              {ultimaModificacion ? formatoFecha(ultimaModificacion) : "-"}
            </td>
            <td className="text-sm text-gray-300 pr-6 text-right group-hover:text-gray-100 hidden sm:table-cell">
              {formatoTamano(tamanoCarpeta)}
            </td>
          </tr>
        );

        if (!abierta) return [filaCarpeta];

        // ✅ FIX 2: antes era [filaCarpeta, .hijosFiltrados]
        return [filaCarpeta, ...hijosFiltrados];
      }

      // Archivo
      return [
        <tr
          key={nodo.ruta}
          className="hover:bg-gray-700/40 transition-colors duration-200 cursor-pointer group"
          onClick={() => navegar(`/gestor-archivos/archivo/${nodo.id}`)}
        >
          <td
            className="py-3 flex items-center gap-2 text-gray-100 group-hover:text-white"
            style={{ paddingLeft: sangriaPx }}
          >
            {iconoPorExtension(nodo.extension)}
            <span className="truncate max-w-[12rem] sm:max-w-[24rem]">
              {nodo.nombre}
            </span>
          </td>
          <td className="text-sm text-gray-300 whitespace-nowrap group-hover:text-gray-100 hidden sm:table-cell">
            {formatoFecha(nodo.creadoEn)}
          </td>
          <td className="text-sm text-gray-300 pr-6 text-right group-hover:text-gray-100 hidden sm:table-cell">
            {formatoTamano(nodo.tamanioBytes)}
          </td>
        </tr>,
      ];
    },
    [
      terminoBusqueda,
      nodosExpandidos,
      calcularTamanoCarpeta,
      obtenerUltimaModificacion,
      ordenar,
    ],
  );

  /* ----------------------------------------------------------------------- */
  /* Memo filas                                                              */
  /* ----------------------------------------------------------------------- */
  const filas = useMemo(() => {
    return Array.isArray(arbolArchivos)
      ? arbolArchivos.sort(ordenar).flatMap((n) => renderizarNodo(n))
      : [];
  }, [
    arbolArchivos,
    nodosExpandidos,
    terminoBusqueda,
    orden,
    ordenar,
    renderizarNodo,
  ]);

  /* ----------------------------------------------------------------------- */
  /* Skeleton de carga                                                       */
  /* ----------------------------------------------------------------------- */
  if (cargando) {
    return (
      <div className="w-full bg-gray-800 rounded-xl p-4 animate-pulse h-64 shadow-lg" />
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Render tabla                                                            */
  /* ----------------------------------------------------------------------- */
  return (
    <div className="w-full bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 sm:pb-3 bg-gray-800 border-b border-gray-700">
        <input
          type="text"
          placeholder="Buscar archivos o carpetas."
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          className="w-full sm:w-80 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
        />

        <div className="flex gap-2 text-sm text-gray-300 overflow-x-auto pb-2 sm:pb-0 items-center">
          <button
            onClick={() => setOrden({ campo: "nombre", asc: !orden.asc })}
            className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1 flex-shrink-0 ${
              orden.campo === "nombre"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-gray-700/50 border border-gray-600"
            }`}
          >
            <span>Nombre</span>
            {orden.campo === "nombre" && (orden.asc ? "↑" : "↓")}
          </button>

          <button
            onClick={() => setOrden({ campo: "creadoEn", asc: !orden.asc })}
            className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1 flex-shrink-0 ${
              orden.campo === "creadoEn"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-gray-700/50 border border-gray-600"
            }`}
          >
            <span>Fecha</span>
            {orden.campo === "creadoEn" && (orden.asc ? "↑" : "↓")}
          </button>

          <button
            onClick={() => setOrden({ campo: "tamanioBytes", asc: !orden.asc })}
            className={`px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1 flex-shrink-0 ${
              orden.campo === "tamanioBytes"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-gray-700/50 border border-gray-600"
            }`}
          >
            <span>Tamaño</span>
            {orden.campo === "tamanioBytes" && (orden.asc ? "↑" : "↓")}
          </button>

          {/* Botón de subida */}
          <button
            onClick={abrirModalSubida}
            className="px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 flex-shrink-0 bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30"
          >
            <Upload size={16} />
            <span>Subir archivo</span>
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto max-h-[calc(100vh-200px)]">
        <table className="min-w-full w-full text-left border-collapse text-sm table-fixed">
          <thead className="sticky top-0 bg-gray-700 backdrop-blur-sm z-10 border-b border-gray-600">
            <tr className="text-gray-300 font-medium">
              <th className="py-3 pl-4 sm:pl-6 text-base font-semibold text-gray-200">
                Nombre
              </th>
              <th className="py-3 w-56 text-base font-semibold text-gray-200 hidden sm:table-cell">
                Última modificación
              </th>
              <th className="py-3 w-32 pr-4 sm:pr-6 text-right text-base font-semibold text-gray-200 hidden sm:table-cell">
                Tamaño
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {filas.length ? (
              filas
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="py-12 text-center text-gray-400 px-4"
                >
                  {terminoBusqueda
                    ? "No se encontraron resultados para tu búsqueda"
                    : "No hay archivos que mostrar"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal subida */}
      {modalSubidaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-xl bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100">
                Subir archivo al repositorio
              </h3>
              <button
                onClick={cerrarModalSubida}
                className="p-2 rounded-lg hover:bg-gray-700/60 text-gray-300"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEstaArrastrando(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEstaArrastrando(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEstaArrastrando(false);
                }}
                onDrop={onDropArchivo}
                className={`w-full rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  estaArrastrando
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-gray-600 bg-gray-900/20"
                }`}
              >
                <p className="text-gray-200 font-medium">
                  Arrastra tu archivo aquí
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  o usa el botón para seleccionar desde tu PC
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <input
                    ref={inputArchivoRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => onSeleccionarArchivo(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => inputArchivoRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600"
                    disabled={subiendoArchivo}
                  >
                    Seleccionar archivo
                  </button>
                </div>

                {archivoSeleccionado && (
                  <div className="mt-4 text-sm text-gray-200">
                    <span className="text-gray-400">Seleccionado:</span>{" "}
                    {archivoSeleccionado.name}{" "}
                    <span className="text-gray-400">
                      ({formatoTamano(archivoSeleccionado.size)})
                    </span>
                  </div>
                )}
              </div>

              {mensajeErrorSubida && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  {mensajeErrorSubida}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={cerrarModalSubida}
                  disabled={subiendoArchivo}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={subirArchivoAlRepositorio}
                  disabled={subiendoArchivo}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                  {subiendoArchivo ? "Subiendo..." : "Subir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TablaArchivos;
