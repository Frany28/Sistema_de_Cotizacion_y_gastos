import { useEffect, useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../api/index";
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

  const alternarNodo = (ruta) =>
    setNodosExpandidos((prev) => ({ ...prev, [ruta]: !prev[ruta] }));

  const coincideBusqueda = (cadena) =>
    cadena.toLowerCase().includes(terminoBusqueda.trim().toLowerCase());

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
        case "tamanioBytes":
          const tamanoA =
            a.tipo === "carpeta"
              ? calcularTamanoCarpeta(a)
              : a.tamanioBytes || 0;
          const tamanoB =
            b.tipo === "carpeta"
              ? calcularTamanoCarpeta(b)
              : b.tamanioBytes || 0;
          return factor * (tamanoA - tamanoB);
        case "creadoEn":
          const fechaA =
            a.tipo === "carpeta"
              ? obtenerUltimaModificacion(a)
              : new Date(a.creadoEn);
          const fechaB =
            b.tipo === "carpeta"
              ? obtenerUltimaModificacion(b)
              : new Date(b.creadoEn);
          return factor * (fechaA - fechaB);
        default:
          return factor * a.nombre.localeCompare(b.nombre);
      }
    },
    [orden, calcularTamanoCarpeta, obtenerUltimaModificacion]
  );

  /* ----------------------------------------------------------------------- */
  /* Render recursivo                                                        */
  /* ----------------------------------------------------------------------- */
  const renderizarNodo = useCallback(
    (nodo, nivel = 0) => {
      // Filtrado por búsqueda
      const tieneCoincidencia = coincideBusqueda(nodo.nombre);

      if (terminoBusqueda && nodo.tipo === "archivo" && !tieneCoincidencia) {
        return [];
      }

      const sangriaPx = 16 + nivel * 24;

      if (nodo.tipo === "carpeta") {
        // Renderizar hijos primero para determinar si hay coincidencias
        const hijosFiltrados = (
          Array.isArray(nodo.hijos) ? nodo.hijos : []
        ).flatMap((h) => renderizarNodo(h, nivel + 1));

        const tieneHijosCoincidentes = hijosFiltrados.length > 0;

        if (terminoBusqueda && !tieneCoincidencia && !tieneHijosCoincidentes) {
          return [];
        }

        const abierta = !!nodosExpandidos[nodo.ruta] || terminoBusqueda;

        // Calcular tamaño y fecha para la carpeta
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
    ]
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
          placeholder="Buscar archivos o carpetas..."
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          className="w-full sm:w-80 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
        />
        <div className="flex gap-2 text-sm text-gray-300 overflow-x-auto pb-2 sm:pb-0">
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
    </div>
  );
}

export default TablaArchivos;
