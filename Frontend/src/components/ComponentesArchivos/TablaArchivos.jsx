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
import axios from "axios";

/**
 * TablaArchivos (v3.0)
 * ---------------------------------------------------------------------------
 * ► Mejora la presentación visual (alineación, sombreado zebra, fila sticky)
 * ► Corrige el error "reduce is not a function" realizando validaciones
 * ► Variables/funciones en camelCase y en español, como pidió el usuario
 */

function TablaArchivos() {
  /* ----------------------------------------------------------------------- */
  /* Estado y carga de datos                                                */
  /* ----------------------------------------------------------------------- */
  const [arbolArchivos, setArbolArchivos] = useState([]);
  const [nodosExpandidos, setNodosExpandidos] = useState({});
  const [cargando, setCargando] = useState(true);

  const obtenerArbolArchivos = useCallback(async () => {
    try {
      const { data } = await axios.get("/archivos/arbol", {
        withCredentials: true,
      });
      // Garantizamos que el resultado sea siempre un array
      setArbolArchivos(Array.isArray(data) ? data : Object.values(data || {}));
    } catch (error) {
      console.error("Error al traer árbol de archivos:", error);
      setArbolArchivos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    obtenerArbolArchivos();
  }, [obtenerArbolArchivos]);

  /* ----------------------------------------------------------------------- */
  /* Utilidades de formato                                                  */
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
    if (!bytes) return "-";
    const unidades = ["B", "KB", "MB", "GB", "TB"];
    let indice = 0;
    let valor = bytes;
    while (valor >= 1024 && indice < unidades.length - 1) {
      valor /= 1024;
      indice++;
    }
    return `${valor.toFixed(indice ? 1 : 0)} ${unidades[indice]}`;
  };

  const obtenerIcono = (extension) => {
    switch (extension?.toLowerCase()) {
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
        return <FileAudio size={18} className="text-amber-500" />;
      case "mp4":
      case "avi":
        return <FileVideo size={18} className="text-violet-500" />;
      default:
        return <FileWarning size={18} className="text-gray-400" />;
    }
  };

  /* ----------------------------------------------------------------------- */
  /* Acciones                                                               */
  /* ----------------------------------------------------------------------- */
  const alternarNodo = (ruta) =>
    setNodosExpandidos((anterior) => ({
      ...anterior,
      [ruta]: !anterior[ruta],
    }));

  /* ----------------------------------------------------------------------- */
  /* Render recursivo                                                       */
  /* ----------------------------------------------------------------------- */
  const renderizarNodo = (nodo, nivel = 0) => {
    const sangriaPx = 20 + nivel * 16;

    // Carpeta ----------------------------------------------------------------
    if (nodo.tipo === "carpeta") {
      const abierta = !!nodosExpandidos[nodo.ruta];

      const filaCarpeta = (
        <tr
          key={nodo.ruta}
          className="group border-b border-gray-600/40 hover:bg-gray-600/30 cursor-pointer select-none"
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

      const hijos = Array.isArray(nodo.hijos) ? nodo.hijos : [];
      const hijosRenderizados = hijos
        .sort((a, b) =>
          a.tipo === b.tipo
            ? a.nombre.localeCompare(b.nombre)
            : a.tipo === "carpeta"
            ? -1
            : 1
        )
        .reduce(
          (acumulador, hijo) =>
            acumulador.concat(renderizarNodo(hijo, nivel + 1)),
          []
        );

      return [filaCarpeta, ...hijosRenderizados];
    }

    // Archivo -----------------------------------------------------------------
    return [
      <tr
        key={nodo.ruta}
        className="border-b border-gray-600/40 hover:bg-gray-600/30"
      >
        <td
          className="py-2 flex items-center gap-2 text-gray-100"
          style={{ paddingLeft: sangriaPx }}
        >
          {obtenerIcono(nodo.extension)}
          <span className="truncate max-w-[18rem]">{nodo.nombre}</span>
        </td>
        <td className="text-sm text-gray-400">{formatoFecha(nodo.creadoEn)}</td>
        <td className="text-sm text-gray-400 pr-4 text-right">
          {formatoTamano(nodo.tamanoBytes)}
        </td>
      </tr>,
    ];
  };

  /* ----------------------------------------------------------------------- */
  /* Skeleton de carga                                                      */
  /* ----------------------------------------------------------------------- */
  if (cargando) {
    return (
      <div className="w-full bg-gray-700 rounded-2xl p-4 animate-pulse h-48" />
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Generación de filas                                                    */
  /* ----------------------------------------------------------------------- */
  const filas = useMemo(() => {
    return Array.isArray(arbolArchivos)
      ? arbolArchivos.reduce(
          (acumulador, nodo) => acumulador.concat(renderizarNodo(nodo)),
          []
        )
      : [];
  }, [arbolArchivos, nodosExpandidos]);

  /* ----------------------------------------------------------------------- */
  /* Render tabla                                                           */
  /* ----------------------------------------------------------------------- */
  return (
    <div className="w-full bg-gray-700 rounded-2xl shadow-lg overflow-x-auto">
      <table className="min-w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-800/70 backdrop-blur-md z-10">
          <tr className="text-gray-300 font-semibold border-b border-gray-600/40">
            <th className="py-3 pl-4">Nombre</th>
            <th className="w-48">Última modificación</th>
            <th className="w-28 pr-4 text-right">Tamaño</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600/40">{filas}</tbody>
      </table>
    </div>
  );
}

export default TablaArchivos;
