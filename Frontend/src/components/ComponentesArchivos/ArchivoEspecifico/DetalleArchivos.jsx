import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import CantidadVersionesArchivo from "./CantidadVersionesArchivos";
import CantidadVersionesMes from "./CantidadVersionesMes";
import AlmacenamientoTotalArchivo from "./AlmacenamientoTotalArchivo";
import TablaHistorialVersiones from "./HistorialVersionesArchivo";
import {
  FileText,
  User,
  Database,
  Calendar,
  File,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  Archive,
  BookOpen,
  FileSpreadsheet,
} from "lucide-react";

const DetalleArchivo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerArchivo = async () => {
      try {
        const res = await api.get(`/archivos/detalle/${id}`);
        setArchivo(res.data);
      } catch (error) {
        console.error("Error al obtener detalles del archivo:", error);
        setArchivo(null);
      } finally {
        setCargando(false);
      }
    };

    obtenerArchivo();
  }, [id]);

  const formatoFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatoTamano = (bytes) => {
    if (!bytes) return "0 B";
    const unidades = ["B", "KB", "MB", "GB"];
    let i = 0;
    let valor = bytes;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(1)} ${unidades[i]}`;
  };

  const obtenerIconoPorTipo = (extension) => {
    const tipo = extension.toLowerCase();

    const colorImagen = "text-blue-400";
    const colorGenerico = "text-red-500";

    if (["jpg", "jpeg", "png", "gif", "svg"].includes(tipo))
      return <ImageIcon className={colorImagen} size={28} />;
    if (["mp4", "mov", "avi", "mkv"].includes(tipo))
      return <Video className={colorGenerico} size={28} />;
    if (["mp3", "wav", "ogg"].includes(tipo))
      return <Music className={colorGenerico} size={28} />;
    if (["zip", "rar", "7z"].includes(tipo))
      return <Archive className={colorGenerico} size={28} />;
    if (["pdf"].includes(tipo))
      return <BookOpen className={colorGenerico} size={28} />;
    if (["xls", "xlsx", "csv"].includes(tipo))
      return <FileSpreadsheet className={colorGenerico} size={28} />;
    if (["js", "jsx", "ts", "html", "css", "py", "java"].includes(tipo))
      return <Code className={colorGenerico} size={28} />;

    return <FileText className={colorGenerico} size={28} />;
  };

  const obtenerDescripcionTipoArchivo = (extension) => {
    const ext = extension.toLowerCase();
    if (["png"].includes(ext)) return "PNG Image";
    if (["jpg", "jpeg"].includes(ext)) return "JPEG Image";
    if (["gif"].includes(ext)) return "GIF Image";
    if (["svg"].includes(ext)) return "SVG Image";
    if (["pdf"].includes(ext)) return "PDF Document";
    if (["doc", "docx"].includes(ext)) return "Word Document";
    if (["xls", "xlsx"].includes(ext)) return "Excel Spreadsheet";
    if (["csv"].includes(ext)) return "CSV File";
    if (["zip", "rar", "7z"].includes(ext)) return "Compressed Archive";
    if (["mp3", "wav"].includes(ext)) return "Audio File";
    if (["mp4", "avi", "mkv"].includes(ext)) return "Video File";
    return `${ext.toUpperCase()} File`;
  };

  return (
    <div className="p-6 w-full bg-gray-900 min-h-screen flex justify-center">
      <div className="w-full">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        {cargando ? (
          <p className="text-gray-400">Cargando detalles...</p>
        ) : archivo ? (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            {/* Encabezado */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gray-700 rounded-lg">
                {obtenerIconoPorTipo(archivo.extension)}
              </div>

              {/* ─── Nombre + etiqueta de estado ─── */}
              <h2 className="text-white text-lg font-semibold leading-tight flex items-center">
                {archivo.nombreOriginal}
                {archivo.estado !== "activo" && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-600/30 text-yellow-300">
                    En papelera
                  </span>
                )}
              </h2>
            </div>

            {/* Detalles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-gray-700 pt-4">
              {/* Tipo */}
              <div className="flex items-start gap-3">
                <FileText className="text-blue-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white">
                    {obtenerDescripcionTipoArchivo(archivo.extension)}
                  </p>
                </div>
              </div>

              {/* Tamaño */}
              <div className="flex items-start gap-3">
                <Database className="text-blue-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-400">Tamaño</p>
                  <p className="text-white">
                    {formatoTamano(archivo.tamanioBytes)}
                  </p>
                </div>
              </div>

              {/* Última Modificación */}
              <div className="flex items-start gap-3">
                <Calendar className="text-blue-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-400">Última Modificación</p>
                  <p className="text-white">
                    {formatoFecha(archivo.actualizadoEn)}
                  </p>
                </div>
              </div>

              {/* Dueño */}
              <div className="flex items-start gap-3">
                <User className="text-blue-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-400">Dueño</p>
                  <p className="text-white">{archivo.nombreUsuario}</p>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-start gap-3 col-span-full">
                <File className="text-blue-400 mt-1" size={20} />
                <div>
                  <p className="text-sm text-gray-400">Localización</p>
                  <p className="text-white break-words">{archivo.rutaS3}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-400">No se pudo cargar el archivo.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-10 justify-center">
          <CantidadVersionesArchivo />
          <CantidadVersionesMes />
          <AlmacenamientoTotalArchivo />
        </div>
        <div className="mt-10">
          <TablaHistorialVersiones idArchivo={id} />
        </div>
      </div>
    </div>
  );
};

export default DetalleArchivo;
