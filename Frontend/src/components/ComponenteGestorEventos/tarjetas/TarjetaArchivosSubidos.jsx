import { useEffect, useState } from "react";
import api from "../../../api";
import { FilePlus } from "lucide-react";

const TarjetaArchivosSubidos = () => {
  const [valor, setValor] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get("/archivos/eventos/contadores");
        setValor(data.totalSubidos ?? 0);
      } catch (error) {
        console.error("Error totalSubidos:", error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  return (
    <div className="w-full h-full min-h-[160px] rounded-2xl border border-zinc-700/60 bg-zinc-800/60 shadow-sm overflow-hidden p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <FilePlus className="text-blue-500" size={22} />
        <p className="text-sm text-zinc-300">Archivos Subidos este mes</p>
      </div>

      {cargando ? (
        <div className="h-8 bg-zinc-700/50 rounded w-1/2 animate-pulse" />
      ) : (
        <h1 className="text-white text-3xl md:text-4xl font-bold leading-none">
          {valor.toLocaleString("es-VE")}
        </h1>
      )}
    </div>
  );
};

export default TarjetaArchivosSubidos;
