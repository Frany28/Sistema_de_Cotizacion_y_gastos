import { useEffect, useState, useMemo } from "react";
import api from "../../../api/index.js";

function AlmacenamientoUtilizado() {
  // estado
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // carga
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    api
      .get("/perfil/tarjeta", { withCredentials: true })
      .then((res) => {
        if (cancelado) return;
        setDatos(res.data);
      })
      .catch((e) => {
        if (cancelado) return;
        setError("No se pudo cargar el almacenamiento.");
        console.error(e);
      })
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  // helpers
  const fmt1 = (num) =>
    typeof num === "number" && isFinite(num) ? num.toFixed(1) : "--";

  const modelo = useMemo(() => {
    const alma = datos?.almacenamiento || {};
    const cuotaMb = alma.cuotaMb; // puede ser null => ilimitado
    const usadoMb = typeof alma.usadoMb === "number" ? alma.usadoMb : 0;
    const ilimitado = Boolean(alma.ilimitado);

    let porcentaje =
      !ilimitado && cuotaMb > 0 ? Math.min(100, (usadoMb / cuotaMb) * 100) : 0;

    // textos
    const usadoTxt = `${fmt1(usadoMb)} MB`;
    const cuotaTxt = ilimitado ? "∞" : `${fmt1(cuotaMb)} MB`;
    const leyendaArriba = ilimitado
      ? `Used ${usadoTxt} of ∞`
      : `Used ${usadoTxt} of ${cuotaTxt}`;

    const leyendaAbajo = ilimitado
      ? `${usadoTxt} Used / ∞ Total`
      : `${usadoTxt} Used / ${cuotaTxt} Total`;

    return {
      porcentaje,
      usadoTxt,
      cuotaTxt,
      leyendaArriba,
      leyendaAbajo,
      ilimitado,
    };
  }, [datos]);

  // donut params
  const size = 120; // tamaño del SVG
  const stroke = 14; // grosor
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - modelo.porcentaje / 100);

  return (
    <div className="w-[480px] max-w-full bg-[#0f172a] rounded-2xl p-6 shadow-lg">
      <h3 className="text-white font-semibold mb-4">
        Almacenamiento Utilizado
      </h3>

      {cargando ? (
        <div className="animate-pulse">
          <div className="h-[120px] w-[120px] rounded-full bg-slate-700 mb-4" />
          <div className="h-3 w-64 bg-slate-700 rounded" />
          <div className="h-2 w-full bg-slate-800 rounded mt-6" />
          <div className="h-3 w-56 bg-slate-700 rounded mt-2" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <>
          {/* Donut */}
          <div className="flex items-center gap-6">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size}>
                {/* track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#E5E7EB33"
                  strokeWidth={stroke}
                  fill="none"
                />
                {/* progress */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#22c55e"
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </svg>
              {/* porcentaje en el centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-3xl font-extrabold">
                  {Math.round(modelo.porcentaje)}%
                </span>
              </div>
            </div>

            {/* leyenda derecha (exacto al ejemplo) */}
            <div className="text-slate-300">
              <p>{modelo.leyendaArriba}</p>
            </div>
          </div>

          {/* barra inferior */}
          {!modelo.ilimitado && (
            <>
              <div className="mt-6 h-2 w-full bg-[#1f2937] rounded">
                <div
                  className="h-2 bg-slate-300 rounded"
                  style={{ width: `${modelo.porcentaje}%` }}
                />
              </div>
              <div className="mt-2 text-slate-400 text-sm">
                {modelo.leyendaAbajo}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default AlmacenamientoUtilizado;
