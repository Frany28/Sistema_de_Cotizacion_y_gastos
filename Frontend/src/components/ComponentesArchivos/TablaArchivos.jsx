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

/**
 * TablaArchivos (v3.2)
 * ---------------------------------------------------------------------------
 * ▸ Tabla explorador con búsqueda, orden y UI responsive.
 * ▸ Cabecera sticky, sombreado zebra y animación skeleton mientras carga.
 * ▸ Corrige posibles TypeErrors (array null/objeto).
 * ▸ Variables y funciones en camelCase y en español.
 */

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

  useEffect(() => {
    obtenerArbolArchivos();
  }, [obtenerArbolArchivos]);

  /* ----------------------------------------------------------------------- */
  /* Helpers                                                                  */
  /* ----------------------------------------------------------------------- */
  const formatoFecha = (iso) => {
    if (!iso) return "-";
    const fecha = new Date(iso);
    const horasDesde = (Date.now() - fecha) / 3_600_000;
    return horasDesde < 48
      ? formatDistanceToNowStrict(fecha, { locale: es, addSuffix: true })
      : format(fecha, "LLL dd, yyyy", { locale: es });
  };

  const formatoTamano = (bytes) => {
    if (bytes == null) return "-";
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
        return <FileText size={18} className="text-red-500" />;
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
        return <FileAudio size={18} className="text-yellow-500" />;
      case "mp4":
      case "avi":
        return <FileVideo size={18} className="text-violet-500" />;
      default:
        return <FileWarning size={18} className="text-gray-400" />;
    }
  };

  const alternarNodo = (ruta) =>
    setNodosExpandidos((prev) => ({ ...prev, [ruta]: !prev[ruta] }));

  const coincideBusqueda = (cadena) =>
    cadena.toLowerCase().includes(terminoBusqueda.trim().toLowerCase());

  /* ----------------------------------------------------------------------- */
  /* Ordenación                                                              */
  /* ----------------------------------------------------------------------- */
  const ordenar = (a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "carpeta" ? -1 : 1;
    const factor = orden.asc ? 1 : -1;
    switch (orden.campo) {
      case "tamanoBytes":
        return factor * ((a.tamanoBytes || 0) - (b.tamanoBytes || 0));
      case "creadoEn":
        return factor * (new Date(a.creadoEn) - new Date(b.creadoEn));
      default:
        return factor * a.nombre.localeCompare(b.nombre);
    }
  };

  /* ----------------------------------------------------------------------- */
  /* Render recursivo                                                        */
  /* ----------------------------------------------------------------------- */
  const renderizarNodo = (nodo, nivel = 0) => {
    // Filtrado por búsqueda -------------------------------------------------
    if (
      terminoBusqueda &&
      nodo.tipo === "archivo" &&
      !coincideBusqueda(nodo.nombre)
    ) {
      return [];
    }

    const sangriaPx = 16 + nivel * 20;

    if (nodo.tipo === "carpeta") {
      // Si la carpeta no contiene coincidencias, ocultar en modo búsqueda
      const hijosFiltrados = (
        Array.isArray(nodo.hijos) ? nodo.hijos : []
      ).flatMap((h) => renderizarNodo(h, nivel + 1));
      if (
        terminoBusqueda &&
        hijosFiltrados.length === 0 &&
        !coincideBusqueda(nodo.nombre)
      ) {
        return [];
      }

      const abierta = !!nodosExpandidos[nodo.ruta] || terminoBusqueda;

      const filaCarpeta = (
        <tr
          key={nodo.ruta}
          className="cursor-pointer hover:bg-gray-600/30 select-none"
          onClick={() => alternarNodo(nodo.ruta)}
        >
          <td
            className="py-2 flex items-center gap-2 font-medium text-gray-100"
            style={{ paddingLeft: sangriaPx }}
          >
            {abierta ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
            <Folder size={18} className="text-blue-400" />
            <span>{nodo.nombre.replace(/_/g, " ")}</span>
          </td>
          <td className="text-sm text-gray-400">-</td>
          <td className="text-sm text-gray-400 pr-4 text-right">-</td>
        </tr>
      );

      if (!abierta) return [filaCarpeta];

      return [filaCarpeta, ...hijosFiltrados];
    }

    // Archivo ---------------------------------------------------------------
    return [
      <tr key={nodo.ruta} className="hover:bg-gray-600/30">
        <td
          className="py-2 flex items-center gap-2 text-gray-100"
          style={{ paddingLeft: sangriaPx }}
        >
          {iconoPorExtension(nodo.extension)}
          <span className="truncate max-w-[18rem] md:max-w-none">
            {nodo.nombre}
          </span>
        </td>
        <td className="text-sm text-gray-400 whitespace-nowrap md:w-56">
          {formatoFecha(nodo.creadoEn)}
        </td>
        <td className="text-sm text-gray-400 pr-4 text-right hidden sm:table-cell md:w-28">
          {formatoTamano(nodo.tamanoBytes)}
        </td>
      </tr>,
    ];
  };

  /* ----------------------------------------------------------------------- */
  /* Memo filas                                                              */
  /* ----------------------------------------------------------------------- */
  const filas = useMemo(() => {
    return Array.isArray(arbolArchivos)
      ? arbolArchivos.sort(ordenar).flatMap((n) => renderizarNodo(n))
      : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arbolArchivos, nodosExpandidos, terminoBusqueda, orden]);

  /* ----------------------------------------------------------------------- */
  /* Skeleton de carga                                                       */
  /* ----------------------------------------------------------------------- */
  if (cargando) {
    return (
      <div className="w-full bg-gray-700 rounded-2xl p-4 animate-pulse h-56" />
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Render tabla                                                            */
  /* ----------------------------------------------------------------------- */
  return (
    <div className="w-full bg-gray-700 rounded-2xl shadow-lg overflow-x-auto">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 pb-0">
        <input
          type="text"
          placeholder="Buscar…"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          className="w-full sm:w-60 bg-gray-600/60 border border-gray-500 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1 text-xs text-gray-300">
          <button
            onClick={() => setOrden({ campo: "nombre", asc: !orden.asc })}
            className="px-2 py-1 rounded-md hover:bg-gray-600/40"
          >
            Nombre {orden.campo === "nombre" && (orden.asc ? "▲" : "▼")}
          </button>
          <button
            onClick={() => setOrden({ campo: "creadoEn", asc: !orden.asc })}
            className="px-2 py-1 rounded-md hover:bg-gray-600/40"
          >
            Fecha {orden.campo === "creadoEn" && (orden.asc ? "▲" : "▼")}
          </button>
          <button
            onClick={() => setOrden({ campo: "tamanoBytes", asc: !orden.asc })}
            className="px-2 py-1 rounded-md hover:bg-gray-600/40 hidden sm:inline-block"
          >
            Tamaño {orden.campo === "tamanoBytes" && (orden.asc ? "▲" : "▼")}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <table className="min-w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-800/70 backdrop-blur-md z-10">
          <tr className="text-gray-300 font-semibold border-b border-gray-600/40 text-xs sm:text-sm">
            <th className="py-3 pl-4">Nombre</th>
            <th className="w-48">Última modificación</th>
            <th className="w-28 pr-4 text-right hidden sm:table-cell">
              Tamaño
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600/25">
          {filas.length ? (
            filas
          ) : (
            <tr>
              <td colSpan={3} className="py-10 text-center text-gray-400">
                No hay archivos que mostrar
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TablaArchivos;
