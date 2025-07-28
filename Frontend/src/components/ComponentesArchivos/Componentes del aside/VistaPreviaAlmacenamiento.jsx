// src/components/ComponentesArchivos/VistaPreviaAlmacenamiento.jsx
import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

function VistaPreviaAlmacenamiento() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  /* ─────────────────── carga del backend ─────────────────── */
  useEffect(() => {
    api
      .get("/almacenamiento/mi-uso", { withCredentials: true })
      .then((res) => setDatos(res.data))
      .catch(() => setError("Error al cargar almacenamiento"))
      .finally(() => setCargando(false));
  }, []);

  /* ────────────── cálculo de métricas y textos ────────────── */
  const MB = 1_048_576;
  const usadoMb = datos?.usadoMb ?? 0;
  const cuotaMb = datos?.cuotaMb ?? null;
  const restantes = cuotaMb !== null ? cuotaMb - usadoMb : Infinity;
  const porcentaje =
    cuotaMb !== null && cuotaMb > 0
      ? Math.min(100, (usadoMb / cuotaMb) * 100)
      : 0;

  const usadoTexto = cargando ? "--" : `${usadoMb.toLocaleString()} MB`;
  const cuotaTexto =
    cuotaMb === null
      ? "Almacenamiento Infinito"
      : `${cuotaMb.toLocaleString()} MB`;
  const restantesTexto =
    cuotaMb === null
      ? "∞"
      : `${restantes < 0 ? 0 : restantes.toLocaleString()} MB`;

  /* ────────────────────────── UI ─────────────────────────── */
  return (
    <div className="w-full lg:w-[280px] xl:w-[320px] h-36 lg:h-40 bg-gray-700 rounded-xl lg:rounded-2xl">
      {/* Encabezado */}
      <div className="flex p-4 lg:p-5 gap-2 items-center">
        <HardDrive color="#1A56DB" className="w-5 h-5" />
        <h2 className="text-white font-semibold text-base lg:text-lg">
          Almacenamiento
        </h2>
      </div>

      {/* Métricas principales */}
      {cargando ? (
        <p className="pl-4 lg:pl-5 text-gray-300 animate-pulse">Cargando…</p>
      ) : error ? (
        <p className="pl-4 lg:pl-5 text-red-400 text-sm">{error}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5 pl-4 lg:pl-5">
            <h1 className="text-white font-bold text-xl lg:text-2xl">
              {usadoTexto}
            </h1>
            <p className="text-gray-500 font-semibold text-sm">
              de {cuotaTexto}
            </p>
          </div>

          {/* Barra de progreso (solo si la cuota NO es infinita) */}
          {cuotaMb !== null && (
            <>
              <div className="relative h-1.5 lg:h-2 bg-gray-600 rounded mx-4 lg:mx-5 mt-2 lg:mt-3">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={porcentaje}
                  className="h-full bg-[#1A56DB] rounded transition-all duration-500"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              {/* Texto restantes + enlace Ver más */}
              <div className="flex justify-between px-4 lg:px-5 mt-1.5 lg:mt-2 text-xs lg:text-sm">
                <span className="text-gray-400">
                  {restantesTexto} restantes
                </span>
                <button
                  onClick={() => navigate("/almacenamiento")}
                  className="text-[#1A56DB] hover:underline focus:outline-none"
                >
                  Ver más
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default VistaPreviaAlmacenamiento;
