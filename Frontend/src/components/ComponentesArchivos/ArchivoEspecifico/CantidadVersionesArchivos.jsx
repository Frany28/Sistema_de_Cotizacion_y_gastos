// src/components/ComponentesArchivos/CantidadVersionesArchivos.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { Layers } from "lucide-react"; // Ícono que se parece al de la imagen

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

      {cargando ? (
        <div className="flex flex-col justify-center h-full animate-pulse">
          <div className="bg-gray-700 h-4 w-1/3 rounded mb-2"></div>
          <div className="bg-gray-600 h-8 w-1/4 rounded mb-2"></div>
          <div className="bg-gray-700 h-3 w-2/3 rounded"></div>
        </div>
      ) : (
        <div className="flex flex-col justify-center h-full">
          <p className="text-sm text-gray-400">Total de Versiones</p>
          <h1 className="text-white text-3xl font-bold mt-1">
            {cantidadVersiones}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            A lo largo de toda la historia
          </p>
        </div>
      )}
    </div>
  );
};

export default CantidadVersionesArchivo;
