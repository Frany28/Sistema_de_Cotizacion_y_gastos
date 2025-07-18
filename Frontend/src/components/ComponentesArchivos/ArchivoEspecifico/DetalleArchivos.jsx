import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
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
    return new Date(fecha).toLocaleString("es-VE");
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
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(tipo))
      return <ImageIcon className="text-blue-400" size={20} />;
    if (["mp4", "mov", "avi", "mkv"].includes(tipo))
      return <Video className="text-blue-400" size={20} />;
    if (["mp3", "wav", "ogg"].includes(tipo))
      return <Music className="text-blue-400" size={20} />;
    if (["zip", "rar", "7z"].includes(tipo))
      return <Archive className="text-blue-400" size={20} />;
    if (["pdf"].includes(tipo))
      return <BookOpen className="text-blue-400" size={20} />;
    if (["xls", "xlsx", "csv"].includes(tipo))
      return <FileSpreadsheet className="text-blue-400" size={20} />;
    if (["js", "jsx", "ts", "html", "css", "py", "java"].includes(tipo))
      return <Code className="text-blue-400" size={20} />;
    return <FileText className="text-blue-400" size={20} />;
  };

  return (
    <div className="p-6 w-full bg-gray-900 min-h-screen">
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
        <div className="bg-gray-800 p-6 rounded-xl w-full max-w-4xl mx-auto shadow-lg border border-gray-700">
          {/* Encabezado con icono */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gray-700 rounded-lg">
              {obtenerIconoPorTipo(archivo.extension)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {archivo.nombreOriginal}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Ultima Version: {archivo.ultimaVersion}v
              </p>
            </div>
          </div>

          {/* Detalles del archivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de archivo */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-700 rounded-lg">
                {obtenerIconoPorTipo(archivo.extension)}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </p>
                <p className="text-white font-medium">
                  {archivo.extension.toUpperCase()} Document
                </p>
              </div>
            </div>

            {/* Tamaño */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-700 rounded-lg">
                <Database className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tamaño
                </p>
                <p className="text-white font-medium">
                  {formatoTamano(archivo.tamanioBytes)}
                </p>
              </div>
            </div>

            {/* Última modificación */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-700 rounded-lg">
                <Calendar className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Última Modificación
                </p>
                <p className="text-white font-medium">
                  {formatoFecha(archivo.actualizadoEn)}
                </p>
              </div>
            </div>

            {/* Dueño */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-700 rounded-lg">
                <User className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Dueño
                </p>
                <p className="text-white font-medium">
                  {archivo.nombreUsuario}
                </p>
              </div>
            </div>

            {/* Ubicación */}
            <div className="flex items-start gap-4 md:col-span-2">
              <div className="p-2 bg-gray-700 rounded-lg">
                <File className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ubicación
                </p>
                <p className="text-white font-medium break-words">
                  {archivo.rutaS3}
                </p>
              </div>
            </div>
          </div>

          {/* Sección Dashboard */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Dashboard
            </h3>
            <p className="text-white font-medium">Projects/2024-initiat</p>
          </div>
        </div>
      ) : (
        <p className="text-red-400">No se pudo cargar el archivo.</p>
      )}
    </div>
  );
};

export default DetalleArchivo;
