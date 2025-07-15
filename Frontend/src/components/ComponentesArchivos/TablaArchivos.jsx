import { useEffect, useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  FileArchive,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  FileWarning,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import axios from "axios";

/**
 * TablaArchivos (v2.1 – corrige flatMap para entornos sin polyfill)
 */
function TablaArchivos() {
  const [arbol, setArbol] = useState([]);
  const [expandido, setExpandido] = useState({});
  const [cargando, setCargando] = useState(true);

  const fetchArbol = useCallback(async () => {
    try {
      const { data } = await axios.get("/archivos/arbol", {
        withCredentials: true,
      });
      setArbol(data);
    } catch (e) {
      console.error("Error al traer árbol", e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchArbol();
  }, [fetchArbol]);

  /* Utilidades de formato */
  const fmtFecha = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    const diff = (Date.now() - d) / 3_600_000;
    return diff < 48
      ? formatDistanceToNowStrict(d, { locale: es, addSuffix: true })
      : format(d, "LLL dd, yyyy", { locale: es });
  };
  const fmtSize = (b) => {
    if (!b) return "-";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let n = b;
    while (n >= 1024 && i < u.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
  };
  const icono = (ext) => {
    switch (ext?.toLowerCase()) {
      case "pdf":
        return <FileText size={18} className="text-red-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon size={18} className="text-cyan-400" />;
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

  const toggle = (ruta) => setExpandido((p) => ({ ...p, [ruta]: !p[ruta] }));

  /* Render recursivo (sin flatMap) */
  const renderNodo = (nodo, lvl = 0) => {
    const indent = 16 + lvl * 16; // px para padding-left

    if (nodo.tipo === "carpeta") {
      const open = !!expandido[nodo.ruta];
      const filaCarpeta = (
        <tr
          key={nodo.ruta}
          className="group border-b border-gray-600/50 hover:bg-gray-600/30 cursor-pointer select-none"
          onClick={() => toggle(nodo.ruta)}
        >
          <td
            className="py-2 flex items-center gap-2 text-gray-100 font-medium"
            style={{ paddingLeft: indent }}
          >
            {open ? (
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

      if (!open) return [filaCarpeta];

      // si está abierto, concatenamos sus hijos renderizados
      const hijosRenderizados = nodo.hijos
        .sort((a, b) =>
          a.tipo === b.tipo
            ? a.nombre.localeCompare(b.nombre)
            : a.tipo === "carpeta"
            ? -1
            : 1
        )
        .reduce((acc, h) => acc.concat(renderNodo(h, lvl + 1)), []);

      return [filaCarpeta, ...hijosRenderizados];
    }

    // archivo
    return [
      <tr
        key={nodo.ruta}
        className="border-b border-gray-600/50 hover:bg-gray-600/30"
      >
        <td
          className="py-2 flex items-center gap-2 text-gray-100"
          style={{ paddingLeft: indent }}
        >
          {icono(nodo.extension)}
          <span>{nodo.nombre}</span>
        </td>
        <td className="text-sm text-gray-400">{fmtFecha(nodo.creadoEn)}</td>
        <td className="text-sm text-gray-400 pr-4 text-right">
          {fmtSize(nodo.tamanoBytes)}
        </td>
      </tr>,
    ];
  };

  /* Skeleton */
  if (cargando) {
    return (
      <div className="w-full bg-gray-700 rounded-2xl p-4 animate-pulse h-48" />
    );
  }

  /* Tabla */
  const filas = arbol.reduce((acc, n) => acc.concat(renderNodo(n)), []);

  return (
    <div className="w-full bg-gray-700 rounded-2xl shadow overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-gray-800/60 backdrop-blur-sm z-10">
          <tr className="text-gray-300 text-sm border-b border-gray-600/50">
            <th className="py-3 pl-4 font-semibold">Nombre</th>
            <th className="font-semibold">Última Modificación</th>
            <th className="font-semibold pr-4 text-right">Tamaño</th>
          </tr>
        </thead>
        <tbody>{filas}</tbody>
      </table>
    </div>
  );
}

export default TablaArchivos;
