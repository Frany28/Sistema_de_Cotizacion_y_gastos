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
      return <ImageIcon className="text-blue-500" size={20} />;
    if (["mp4", "mov", "avi", "mkv"].includes(tipo))
      return <Video className="text-blue-500" size={20} />;
    if (["mp3", "wav", "ogg"].includes(tipo))
      return <Music className="text-blue-500" size={20} />;
    if (["zip", "rar", "7z"].includes(tipo))
      return <Archive className="text-blue-500" size={20} />;
    if (["pdf"].includes(tipo))
      return <BookOpen className="text-blue-500" size={20} />;
    if (["xls", "xlsx", "csv"].includes(tipo))
      return <FileSpreadsheet className="text-blue-500" size={20} />;
    if (["js", "jsx", "ts", "html", "css", "py", "java"].includes(tipo))
      return <Code className="text-blue-500" size={20} />;
    return <FileText className="text-blue-500" size={20} />;
  };

  return (
    <div className="p-6 w-full bg-[#f8fafc] min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-[#64748b] hover:text-[#1e293b]"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      {cargando ? (
        <p className="text-[#64748b]">Cargando detalles...</p>
      ) : archivo ? (
        <div className="bg-white p-6 rounded-xl w-full max-w-4xl mx-auto shadow-sm border border-[#e2e8f0]">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-[#f1f5f9] rounded-lg">
              {obtenerIconoPorTipo(archivo.extension)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#1e293b]">
                {archivo.nombreOriginal}
              </h2>
              <p className="text-sm text-[#64748b] mt-1">
                Ultima Version: {archivo.ultimaVersion}v
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#f1f5f9] rounded-lg">
                {obtenerIconoPorTipo(archivo.extension)}
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Type
                </p>
                <p className="text-[#1e293b] font-medium">
                  {archivo.extension.toUpperCase()} Document
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#f1f5f9] rounded-lg">
                <Database className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Tamaño
                </p>
                <p className="text-[#1e293b] font-medium">
                  {formatoTamano(archivo.tamanioBytes)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#f1f5f9] rounded-lg">
                <Calendar className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Última Modificación
                </p>
                <p className="text-[#1e293b] font-medium">
                  {formatoFecha(archivo.actualizadoEn)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#f1f5f9] rounded-lg">
                <User className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Dueño
                </p>
                <p className="text-[#1e293b] font-medium">
                  {archivo.nombreUsuario}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 md:col-span-2">
              <div className="p-2 bg-[#f1f5f9] rounded-lg">
                <File className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                  Ubicación
                </p>
                <p className="text-[#1e293b] font-medium break-words">
                  {archivo.rutaS3}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
            <h3 className="text-xs font-medium text-[#64748b] uppercase tracking-wider mb-3">
              Dashboard
            </h3>
            <p className="text-[#1e293b] font-medium">Projects/2024-initiat</p>
          </div>
        </div>
      ) : (
        <p className="text-red-500">No se pudo cargar el archivo.</p>
      )}
    </div>
  );
};

export default DetalleArchivo;
