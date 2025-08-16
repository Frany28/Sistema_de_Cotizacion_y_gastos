// src/components/archivos/tarjetas/tarjetaArchivosReemplazados.jsx
import { useEffect, useState } from "react";
import api from "../../../api";
import { GitCompare } from "lucide-react";

const TarjetaArchivosReemplazados = () => {
  const [valor, setValor] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get("/archivos/eventos/contadores");
        setValor(data.totalReemplazados ?? 0);
      } catch (error) {
        console.error("Error totalReemplazados:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  return (
    <div className="w-[326px] h-[158px] bg-gray-800 rounded-xl p-5 relative shadow-md border border-gray-700">
      <div className="absolute top-4 left-4">
        <GitCompare className="text-blue-500" size={20} />
      </div>
      <div className="flex flex-col justify-center h-full">
        <p className=" text-sm text-gray-400 ml-7">Archivos Reemplazados</p>
        {cargando ? (
          <div className="h-8 bg-gray-700/50 rounded w-1/2 animate-pulse ml-7" />
        ) : (
          <h1 className="text-white text-3xl font-bold mt-1 ml-7">
            {valor.toLocaleString("es-VE")}
          </h1>
        )}
      </div>
    </div>
  );
};

export default TarjetaArchivosReemplazados;
