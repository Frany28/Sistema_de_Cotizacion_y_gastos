// src/components/ComponentePerfil/EstadisticasAlmacenamiento.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/index.js";

/**
 * EstadisticasAlmacenamiento
 * - Usa datos REALES del endpoint /perfil/estadisticas.
 * - Textos en español y estética idéntica al mock.
 */
function EstadisticasAlmacenamiento({ rutaApi = "/perfil/estadisticas" }) {
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const res = await api.get(rutaApi, { withCredentials: true });
        if (cancelado) return;
        setEstadisticas(res?.data || null);
      } catch (e) {
        if (cancelado) return;
        console.error("Error al cargar /perfil/estadisticas:", e);
        setError("No se pudieron cargar las estadísticas.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [rutaApi]);

  // helpers
  const bytesAMb = (bytes) =>
    typeof bytes === "number" ? bytes / (1024 * 1024) : 0;

  const formatearMb = (bytes) => {
    const mb = bytesAMb(bytes);
    const decimales = mb >= 10 ? 1 : mb < 1 ? 2 : 1;
    return `${mb.toFixed(decimales)} MB`;
  };

  const modelo = useMemo(() => {
    const d = estadisticas || {};
    return {
      totalArchivos: Number(d.totalArchivos || 0),
      totalCarpetas: Number(d.totalGrupos || 0), // “Grupos” en BD = “Carpetas” visualmente
      archivoMasGrande: formatearMb(d.archivoMasGrandeBytes || 0),
      archivoMasPequenio: formatearMb(d.archivoMasPequenioBytes || 0),
      promedioTamano: formatearMb(d.promedioTamBytes || 0),
    };
  }, [estadisticas]);

  return (
    <div className="w-[360px] sm:w-[420px] bg-[#0f172a] rounded-2xl p-5 shadow-lg border border-white/10">
      <h3 className="text-white text-lg font-semibold">
        Estadísticas de Almacenamiento
      </h3>
      <p className="text-slate-400 text-sm mt-1">
        Indicadores clave de tu almacenamiento.
      </p>

      {/* Cargando */}
      {cargando ? (
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-8 rounded bg-slate-700/50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 mt-4">{error}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          <li className="flex items-center justify-between py-2">
            <span className="text-slate-300">Total de Archivos</span>
            <span className="text-white font-bold">{modelo.totalArchivos}</span>
          </li>
          <li className="flex items-center justify-between py-2">
            <span className="text-slate-300">Total de Carpetas</span>
            <span className="text-white font-bold">{modelo.totalCarpetas}</span>
          </li>
          <li className="flex items-center justify-between py-2">
            <span className="text-slate-300">Archivo más grande</span>
            <span className="text-white font-bold">
              {modelo.archivoMasGrande}
            </span>
          </li>
          <li className="flex items-center justify-between py-2">
            <span className="text-slate-300">Archivo más pequeño</span>
            <span className="text-white font-bold">
              {modelo.archivoMasPequenio}
            </span>
          </li>
          <li className="flex items-center justify-between py-2">
            <span className="text-slate-300">Tamaño promedio de archivo</span>
            <span className="text-white font-bold">
              {modelo.promedioTamano}
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

export default EstadisticasAlmacenamiento;
