import { useEffect, useState, useCallback } from "react";
import { Bell, File } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../../api";

function RegistroDeActividades() {
  // Estado local ------------------------------------------------------
  const [eventos, setEventos] = useState([]);

  // Helpers -----------------------------------------------------------
  const obtenerDescripcionAccion = (tipoEvento) => {
    switch (tipoEvento) {
      case "subida":
        return "fue subido";
      case "eliminacion":
        return "fue eliminado";
      case "sustitucion":
        return "fue sustituido";
      case "edicionMetadatos":
        return "fue modificado";
      default:
        return "tuvo actividad";
    }
  };

  const formatearTiempo = (fechaIso) => {
    const fecha = new Date(fechaIso);
    const diffHoras = (Date.now() - fecha.getTime()) / 3_600_000;
    return diffHoras < 48
      ? formatDistanceToNowStrict(fecha, { locale: es, addSuffix: true })
      : format(fecha, "LLL dd, yyyy", { locale: es });
  };

  // Petición al backend ----------------------------------------------
  const fetchEventos = useCallback(async () => {
    try {
      const { data } = await api.get("/archivos/eventos", {
        params: { limit: 3 },
        withCredentials: true,
      });
      setEventos(data.eventos ?? []);
    } catch (error) {
      console.error("Error al obtener eventos:", error);
    }
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  // Render ------------------------------------------------------------
  return (
    <div className="w-full lg:w-[280px] xl:w-[320px] bg-gray-700 rounded-xl lg:rounded-2xl shadow p-3 lg:p-4 flex flex-col gap-2 lg:gap-3">
      {/* Encabezado */}
      <div className="flex items-center gap-2">
        <Bell size={18} color="#1A56DB" />
        <p className="text-white font-semibold text-sm lg:text-base">
          Actividad Reciente
        </p>
      </div>

      {/* Lista de eventos */}
      <div className="flex flex-col gap-2 lg:gap-3 max-h-48 lg:max-h-64 overflow-y-auto pr-1 lg:pr-2">
        {eventos.length === 0 && (
          <p className="text-gray-400 text-xs lg:text-sm pt-1 lg:pt-2">
            Sin actividad por ahora
          </p>
        )}

        {eventos.map(({ nombreArchivo, fechaEvento, tipoEvento }, idx) => (
          <div key={idx} className="flex gap-1.5 lg:gap-2 items-start">
            <File size={16} color="#D1D5DB" className="mt-0.5 flex-shrink-0" />

            <div className="grid grid-cols-1">
              <p className="text-white text-xs lg:text-sm">
                <span className="font-medium">{nombreArchivo}</span>{" "}
                {obtenerDescripcionAccion(tipoEvento)}.
              </p>
              <p className="text-[11px] lg:text-[13px] text-gray-400">
                {formatearTiempo(fechaEvento)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <button
        type="button"
        onClick={() => window.location.assign("/gestor-archivos")}
        className="text-center text-xs lg:text-sm font-medium text-[#1A56DB] hover:underline focus:outline-none"
      >
        Ver Actividad Reciente
      </button>
    </div>
  );
}

export default RegistroDeActividades;
