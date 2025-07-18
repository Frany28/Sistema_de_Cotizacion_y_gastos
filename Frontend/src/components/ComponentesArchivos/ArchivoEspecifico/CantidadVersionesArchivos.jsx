import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { FileText } from "lucide-react";

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
    <div className="flex items-start gap-3">
      <FileText className="text-blue-400 mt-1" size={20} />
      <div>
        <p className="text-sm text-gray-400">Cantidad de versiones</p>
        <p className="text-white">
          {cargando ? "Cargando..." : cantidadVersiones}
        </p>
      </div>
    </div>
  );
};

export default CantidadVersionesArchivo;
