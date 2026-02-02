// src/components/ComponentesArchivos/AlmacenamientoTotalArchivo.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { HardDrive } from "lucide-react";

const AlmacenamientoTotalArchivo = () => {
  const { id } = useParams();
  const [almacenamientoBytes, setAlmacenamientoBytes] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerAlmacenamiento = async () => {
      try {
        const res = await api.get(
          `/archivos/eventos/${id}/almacenamiento-total`,
        );

        // Blindaje: totalBytes puede venir como string (BIGINT) o null
        const totalBytesSeguro = Number(res.data?.totalBytes);
        setAlmacenamientoBytes(
          Number.isFinite(totalBytesSeguro) ? totalBytesSeguro : 0,
        );
      } catch (error) {
        console.error("Error al obtener almacenamiento:", error);
        setAlmacenamientoBytes(0);
      } finally {
        setCargando(false);
      }
    };

    obtenerAlmacenamiento();
  }, [id]);

  const formatearTamanio = (bytes) => {
    const numeroBytes = Number(bytes);

    if (!Number.isFinite(numeroBytes) || numeroBytes <= 0) return "0 B";

    const unidades = ["B", "KB", "MB", "GB", "TB"];
    let indice = 0;
    let valor = numeroBytes;

    while (valor >= 1024 && indice < unidades.length - 1) {
      valor /= 1024;
      indice++;
    }

    return `${valor.toFixed(1)} ${unidades[indice]}`;
  };

  return (
    <div className="w-[400px] h-[162px] bg-gray-800 rounded-xl p-5 relative shadow-md border border-gray-700">
      <div className="absolute top-4 right-4">
        <HardDrive className="text-blue-500" size={20} />
      </div>

      <div className="flex flex-col justify-center h-full">
        <p className="text-sm text-gray-400">Almacenamiento utilizado</p>

        {cargando ? (
          <div className="h-8 bg-gray-700/50 rounded w-2/3 animate-pulse" />
        ) : (
          <h1 className="text-white text-3xl font-bold mt-1">
            {formatearTamanio(almacenamientoBytes)}
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
