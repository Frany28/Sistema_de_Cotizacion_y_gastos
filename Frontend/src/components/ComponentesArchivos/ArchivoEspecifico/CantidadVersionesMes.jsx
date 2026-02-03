// src/components/ComponentesArchivos/CantidadVersionesMes.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { Clock4 } from "lucide-react";

const CantidadVersionesMes = () => {
  const { id } = useParams();
  const [versionesMes, setVersionesMes] = useState(0);
  const [cargando, setCargando] = useState(true);

  // ✅ Mes actual en español (ej: "febrero")
  const mesActual = useMemo(() => {
    return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(
      new Date(),
    );
  }, []);

  useEffect(() => {
    const obtenerCantidadMes = async () => {
      try {
        const res = await api.get(`/archivos/eventos/${id}/versiones-del-mes`);

        const totalDelMesNormalizado = Number(res?.data?.totalDelMes);
        setVersionesMes(
          Number.isFinite(totalDelMesNormalizado) ? totalDelMesNormalizado : 0,
        );
      } catch (error) {
        console.error("Error al obtener versiones del mes:", error);
        setVersionesMes(0);
      } finally {
        setCargando(false);
      }
    };

    if (id) obtenerCantidadMes();
  }, [id]);

  return (
    <div className="w-[400px] h-[162px] bg-gray-800 rounded-xl p-5 relative shadow-md border border-gray-700">
      <div className="absolute top-4 right-4">
        <Clock4 className="text-yellow-400" size={20} />
      </div>

      <div className="flex flex-col justify-center h-full">
        <p className="text-sm text-gray-400">Versiones este mes</p>

        {cargando ? (
          <div className="h-8 bg-gray-700/50 rounded w-1/2 animate-pulse" />
        ) : (
          <h1 className="text-white text-3xl font-bold mt-1">{versionesMes}</h1>
        )}

        <p className="text-xs text-gray-500 mt-1">{`Añadidas en ${mesActual}`}</p>
      </div>
    </div>
  );
};

export default CantidadVersionesMes;
