import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import api from "../../../api";

const CantidadVersionesArchivo = ({ grupoArchivoId }) => {
  const [cantidadVersiones, setCantidadVersiones] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerCantidad = async () => {
      try {
        const res = await api.get(
          `/archivos/grupo/${grupoArchivoId}/versiones`
        );
        setCantidadVersiones(res.data.length);
      } catch (error) {
        console.error("Error al obtener versiones:", error);
      } finally {
        setCargando(false);
      }
    };

    if (grupoArchivoId) obtenerCantidad();
  }, [grupoArchivoId]);

  return (
    <div className="w-[400px] h-[162px] bg-gray-800 rounded-xl p-5 relative shadow-md border border-gray-700">
      <div className="absolute top-4 right-4">
        <Layers className="text-blue-500" size={20} />
      </div>

      <div className="flex flex-col justify-center h-full">
        <p className="text-sm text-gray-400">Total de Versiones</p>
        <h1 className="text-white text-3xl font-bold mt-1">
          {cargando ? "..." : cantidadVersiones}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          A lo largo de toda la historia
        </p>
      </div>
    </div>
  );
};

export default CantidadVersionesArchivo;
