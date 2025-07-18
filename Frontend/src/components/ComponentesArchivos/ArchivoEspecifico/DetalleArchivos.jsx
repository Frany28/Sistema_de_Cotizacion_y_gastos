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
    <div className="p-6 w-full bg-gray-100 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      {cargando ? (
        <p className="text-gray-600">Cargando detalles...</p>
      ) : archivo ? (
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto border border-gray-200">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {archivo.nombreOriginal}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ultima Version: {archivo.ultimaVersion}v
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <FileText className="text-blue-600" size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </p>
                <p className="text-gray-800 font-medium">
                  {archivo.extension.toUpperCase()} Document
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <Database className="text-blue-600" size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tamaño
                </p>
                <p className="text-gray-800 font-medium">
                  {formatoTamano(archivo.tamanioBytes)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <Calendar className="text-blue-600" size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Modificación
                </p>
                <p className="text-gray-800 font-medium">
                  {formatoFecha(archivo.actualizadoEn)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <User className="text-blue-600" size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dueño
                </p>
                <p className="text-gray-800 font-medium">
                  {archivo.nombreUsuario}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 md:col-span-2">
              <div className="p-2 bg-blue-50 rounded-full">
                <File className="text-blue-600" size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </p>
                <p className="text-gray-800 font-medium break-words">
                  {archivo.rutaS3}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Dashboard
            </h3>
            <p className="text-gray-800 font-medium">Projects/2024-initiat</p>
          </div>
        </div>
      ) : (
        <p className="text-red-500">No se pudo cargar el archivo.</p>
      )}
    </div>
  );
};

export default DetalleArchivo;
