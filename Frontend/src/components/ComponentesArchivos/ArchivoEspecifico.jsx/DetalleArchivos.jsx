import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import { ArrowLeft } from "lucide-react";

const DetalleArchivo = () => {
  const { id } = useParams(); // Obtenemos el ID desde la URL
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

  return (
    <div className="p-6 text-white">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-gray-300 hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      <h2 className="text-2xl font-semibold mb-6">Detalle del Archivo</h2>

      {cargando ? (
        <p className="text-gray-400">Cargando detalles...</p>
      ) : archivo ? (
        <div className="bg-gray-800 p-5 rounded-xl space-y-3 w-full max-w-lg">
          <p>
            <strong>Nombre:</strong> {archivo.nombre}
          </p>
          <p>
            <strong>Tipo MIME:</strong> {archivo.tipoMime}
          </p>
          <p>
            <strong>Tamaño:</strong> {archivo.tamanoKb} KB
          </p>
          <p>
            <strong>Fecha subida:</strong>{" "}
            {new Date(archivo.fechaSubida).toLocaleString("es-VE")}
          </p>
          <p>
            <strong>Versión actual:</strong> {archivo.versionActual}
          </p>
          <p>
            <strong>Usuario que subió:</strong> {archivo.usuarioSubida}
          </p>
          <p>
            <strong>Estado:</strong> {archivo.estado}
          </p>
          <p>
            <strong>Ruta lógica:</strong> {archivo.rutaLogica}
          </p>
          {/* puedes agregar más campos según lo que devuelva el backend */}
        </div>
      ) : (
        <p className="text-red-400">No se pudo cargar el archivo.</p>
      )}
    </div>
  );
};

export default DetalleArchivo;
