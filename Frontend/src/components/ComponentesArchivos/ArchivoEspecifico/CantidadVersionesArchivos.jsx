// src/components/ComponentesArchivos/CantidadVersionesArchivos.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { Layers } from "lucide-react";

const CantidadVersionesArchivo = () => {
  const { id } = useParams();
  const [cantidadVersiones, setCantidadVersiones] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerCantidad = async () => {
      try {
        const res = await api.get(`/archivos/${id}/total-versiones`);
        setCantidadVersiones(res.data.totalVersiones);
      } catch (error) {
        console.error("Error al obtener cantidad de versiones:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerCantidad();
  }, [id]);

  return (
    <div className="w-[400px] h-[162px] bg-gray-800 rounded-xl p-5 relative shadow-md border border-gray-700">
      <div className="absolute top-4 right-4">
        <Layers className="text-blue-500" size={20} />
      </div>

      {/* Contenido centrado */}
      <div className="flex flex-col justify-center h-full">
        <p className="text-sm text-gray-400">Total de Versiones</p>
        {cargando ? (
          <div className="h-8 bg-gray-700/50 rounded w-1/2 animate-pulse" />
        ) : (
          <h1 className="text-white text-3xl font-bold mt-1">
            {cantidadVersiones}
          </h1>
        )}

        <p className="text-xs text-gray-500 mt-1">
          A lo largo de toda la historia
        </p>
      </div>
    </div>
  );
};

export default CantidadVersionesArchivo;
