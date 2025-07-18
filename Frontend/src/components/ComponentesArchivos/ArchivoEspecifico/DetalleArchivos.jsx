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

  return (
    <div className="p-6 text-white w-full">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-gray-300 hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      {cargando ? (
        <p className="text-gray-400">Cargando detalles...</p>
      ) : archivo ? (
        <div className="bg-gray-800 p-6 rounded-xl w-full max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold mb-2 text-white">
            {archivo.nombreOriginal}
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            Última Versión: v{archivo.ultimaVersion}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p>{archivo.extension.toUpperCase()} Document</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Database className="text-blue-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Tamaño</p>
                <p>{formatoTamano(archivo.tamanioBytes)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="text-blue-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Última Modificación</p>
                <p>{formatoFecha(archivo.actualizadoEn)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="text-blue-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Dueño</p>
                <p>{archivo.nombreUsuario}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <File className="text-blue-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Ubicación</p>
                <p className="break-words">{archivo.rutaS3}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-red-400">No se pudo cargar el archivo.</p>
      )}
    </div>
  );
};

export default DetalleArchivo;
