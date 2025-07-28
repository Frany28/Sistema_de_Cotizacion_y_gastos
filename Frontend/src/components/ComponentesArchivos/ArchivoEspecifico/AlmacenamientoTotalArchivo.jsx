// src/components/ComponentesArchivos/AlmacenamientoTotalArchivo.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { HardDrive } from "lucide-react";

const AlmacenamientoTotalArchivo = () => {
  const { id } = useParams();
  const [almacenamiento, setAlmacenamiento] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerAlmacenamiento = async () => {
      try {
        const res = await api.get(
          `/archivos/eventos/${id}/almacenamiento-total`
        );
        setAlmacenamiento(res.data.totalBytes);
      } catch (error) {
        console.error("Error al obtener almacenamiento:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerAlmacenamiento();
  }, [id]);

  const formatearTamanio = (bytes) => {
    if (bytes == null || isNaN(bytes)) return "0 B";
    const unidades = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let valor = bytes;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(1)} ${unidades[i]}`;
  };

  return (
    <div className="w-[400px] h-[162px] bg-gray-800 rounded-xl p-5 relative shadow-md border border-gray-700">
      <div className="absolute top-4 right-4">
        <HardDrive className="text-blue-500" size={20} />
      </div>

      <div className="flex flex-col justify-center h-full">
        <p className="text-sm text-gray-400">Almacenamiento utilizado</p>
        {cargando ? (
          <div className="h-8 bg-gray-700/50 rounded w-1/2 animate-pulse" />
        ) : (
          <h1 className="text-white text-3xl font-bold mt-1">
            {cantidadVersiones}
          </h1>
        )}

        <p className="text-xs text-gray-500 mt-1">
          Total por todas las versiones
        </p>
      </div>
    </div>
  );
};

export default AlmacenamientoTotalArchivo;
