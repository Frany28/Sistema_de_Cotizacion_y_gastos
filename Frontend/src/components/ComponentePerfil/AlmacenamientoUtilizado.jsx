import { useEffect, useState, useMemo } from "react";
import api from "../../api/index.js";

function AlmacenamientoUtilizado() {
  // estado
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // carga de datos reales
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

  // helpers de formato
  const formatearNumero = (num) =>
    typeof num === "number" && isFinite(num) ? num.toFixed(1) : "--";

  // modelo de vista (cálculos derivados)
  const modelo = useMemo(() => {
    const almacenamiento = datos?.almacenamiento || {};
    const cuotaMb = almacenamiento.cuotaMb; // puede ser null => ilimitado
    const usadoMb =
      typeof almacenamiento.usadoMb === "number" ? almacenamiento.usadoMb : 0;
    const ilimitado = Boolean(almacenamiento.ilimitado);

    const porcentaje =
      !ilimitado && cuotaMb > 0 ? Math.min(100, (usadoMb / cuotaMb) * 100) : 0;

    const usadoTxt = `${formatearNumero(usadoMb)} MB`;
    const cuotaTxt = ilimitado ? "∞" : `${formatearNumero(cuotaMb)} MB`;

    const leyendaArriba = ilimitado
      ? `Usado ${usadoTxt} de ∞`
      : `Usado ${usadoTxt} de ${cuotaTxt}`;

    const leyendaAbajo = ilimitado
      ? `${usadoTxt} Usado / ∞ Total`
      : `${usadoTxt} Usado / ${cuotaTxt} Total`;

    return {
      porcentaje,
      usadoTxt,
      cuotaTxt,
      leyendaArriba,
      leyendaAbajo,
      ilimitado,
    };
  }, [datos]);

  // parámetros del donut
  const tamSvg = 160; // tamaño del SVG (más grande como el mock)
  const grosorTrazo = 18; // grosor del anillo
  const radio = (tamSvg - grosorTrazo) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const desplazamiento = circunferencia * (1 - modelo.porcentaje / 100);

  return (
    <div className="w-full max-w-4xl bg-[#1f2937] rounded-2xl p-6 shadow-lg border border-white/5">
      {/* Título como en el mock (alineado a la izquierda) */}
      <h3 className="text-white text-lg font-semibold mb-6">
        Almacenamiento Utilizado
      </h3>

      {cargando ? (
        <div className="flex flex-col items-center">
          <div className="h-[160px] w-[160px] rounded-full bg-slate-700/40 mb-4 animate-pulse" />
          <div className="h-3 w-72 bg-slate-700/40 rounded mb-8 animate-pulse" />
          <div className="h-2 w-full bg-slate-800/60 rounded animate-pulse" />
          <div className="h-3 w-64 bg-slate-700/40 rounded mt-2 animate-pulse" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <>
          {/* Bloque central totalmente CENTRADO */}
          <div className="flex flex-col items-center justify-center">
            {/* Donut */}
            <div className="relative" style={{ width: tamSvg, height: tamSvg }}>
              <svg width={tamSvg} height={tamSvg}>
                {/* pista (gris claro translúcido) */}
                <circle
                  cx={tamSvg / 2}
                  cy={tamSvg / 2}
                  r={radio}
                  stroke="#e5e7eb26"
                  strokeWidth={grosorTrazo}
                  fill="none"
                />
                {/* progreso (verde) */}
                <circle
                  cx={tamSvg / 2}
                  cy={tamSvg / 2}
                  r={radio}
                  stroke="#22c55e"
                  strokeWidth={grosorTrazo}
                  fill="none"
                  strokeDasharray={circunferencia}
                  strokeDashoffset={desplazamiento}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${tamSvg / 2} ${tamSvg / 2})`}
                />
              </svg>

              {/* porcentaje centrado dentro del círculo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-4xl font-extrabold tracking-tight">
                  {Math.round(modelo.porcentaje)}%
                </span>
              </div>
            </div>

            {/* Texto centrado bajo el donut */}
            <p className="mt-4 text-slate-300 text-sm sm:text-base text-center">
              {modelo.leyendaArriba}
            </p>
          </div>

          {/* Barra inferior y leyenda, ambas centradas */}
          {!modelo.ilimitado && (
            <>
              <div className="mt-8 h-2 w-full rounded bg-[#1e293b] overflow-hidden">
                <div
                  className="h-full rounded bg-indigo-400/80"
                  style={{ width: `${modelo.porcentaje}%` }}
                />
              </div>
              <div className="mt-2 text-slate-400 text-sm text-center">
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
