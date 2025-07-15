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
import api from "../../../api";
import clsx from "clsx";

/**
 * TablaArchivos
 * --------------
 * ▸ Consume GET /archivos/arbol y pinta una tabla estilo explorador.
 * ▸ Permite expandir/cerrar carpetas. El estado se guarda en memory (no URL).
 * ▸ Iconos según tipo de archivo (pdf, img, docx, etc.) siguiendo el color
 *   de tu mockup.
 */
function TablaArchivos() {
  /* =============================================================
   *  Estado y helpers
   * ============================================================= */
  const [arbol, setArbol] = useState([]); // árbol completo desde el backend
  const [expandido, setExpandido] = useState({}); // { "ruta/carpeta": true }

  /** Cargar árbol una sola vez */
  const fetchArbol = useCallback(async () => {
    try {
      const { data } = await api.get("/archivos/arbol", {
        withCredentials: true,
      });
      setArbol(data);
    } catch (e) {
      console.error("Error al traer árbol de archivos", e);
    }
  }, []);

  useEffect(() => {
    fetchArbol();
  }, [fetchArbol]);

  /** Toggle carpeta */
  const handleToggle = (ruta) => {
    setExpandido((prev) => ({ ...prev, [ruta]: !prev[ruta] }));
  };

  /** Formatear tiempo modificación (igual lógica de tarjeta) */
  const fmtFecha = (iso) => {
    const fecha = new Date(iso);
    const diffH = (Date.now() - fecha) / 3_600_000;
    return diffH < 48
      ? formatDistanceToNowStrict(fecha, { locale: es, addSuffix: true })
      : format(fecha, "LLL dd, yyyy", { locale: es });
  };

  const fmtTamano = (bytes) => {
    if (bytes == null) return "-";
    const unidades = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let num = bytes;
    while (num >= 1024 && i < unidades.length - 1) {
      num /= 1024;
      i++;
    }
    return `${num.toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
  };

  /** icono segun extension */
  const getIconoArchivo = (ext) => {
    switch (ext.toLowerCase()) {
      case "pdf":
        return <FileText size={18} color="#DC2626" />; // rojo
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon size={18} color="#22D3EE" />; // cian
      case "zip":
      case "rar":
        return <FileArchive size={18} color="#FBBF24" />; // ámbar
      case "mp3":
      case "wav":
        return <FileAudio size={18} color="#F59E0B" />;
      case "mp4":
      case "avi":
        return <FileVideo size={18} color="#A855F7" />;
      default:
        return <FileWarning size={18} color="#6B7280" />; // gris
    }
  };

  /* =============================================================
   *  Render fila recursiva (folder o file)
   * ============================================================= */
  const renderNodo = (nodo, nivel = 0) => {
    if (nodo.tipo === "carpeta") {
      const abierto = !!expandido[nodo.ruta];
      return (
        <>
          <tr
            key={nodo.ruta}
            className="cursor-pointer hover:bg-gray-600/40"
            onClick={() => handleToggle(nodo.ruta)}
          >
            <td className="py-2 pl-4 pr-3 flex items-center gap-2 text-white font-medium">
              {abierto ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
              <Folder size={18} color="#3B82F6" />
              {nodo.nombre}
            </td>
            <td className="text-sm text-gray-400">-</td>
            <td className="text-sm text-gray-400 pr-4 text-right">-</td>
          </tr>
          {abierto &&
            nodo.hijos
              .sort((a, b) =>
                a.tipo === b.tipo
                  ? a.nombre.localeCompare(b.nombre)
                  : a.tipo === "carpeta"
                  ? -1
                  : 1
              )
              .flatMap((h) => renderNodo(h, nivel + 1))}
        </>
      );
    }

    // archivo
    return (
      <tr key={nodo.ruta} className="hover:bg-gray-600/40">
        <td
          className={clsx(
            "py-2 pr-3 flex items-center gap-2 text-white",
            nivel > 0 && `pl-${4 + nivel * 4}`
          )}
        >
          {getIconoArchivo(nodo.extension)}
          {nodo.nombre}
        </td>
        <td className="text-sm text-gray-400">{fmtFecha(nodo.creadoEn)}</td>
        <td className="text-sm text-gray-400 pr-4 text-right">
          {fmtTamano(nodo.tamanoBytes)}
        </td>
      </tr>
    );
  };

  /* =============================================================
   *  Tabla completa
   * ============================================================= */
  return (
    <div className="w-full bg-gray-700 rounded-2xl shadow pt-5">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="text-gray-300 text-sm">
            <th className="py-3 pl-4 font-semibold">Nombre</th>
            <th className="font-semibold">Última Modificación</th>
            <th className="font-semibold pr-4 text-right">Tamaño</th>
          </tr>
        </thead>
        <tbody>{arbol.flatMap((n) => renderNodo(n))}</tbody>
      </table>
    </div>
  );
}

export default TablaArchivos;
