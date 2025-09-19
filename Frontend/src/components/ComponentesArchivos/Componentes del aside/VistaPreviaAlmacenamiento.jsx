import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/index.js";

function VistaPreviaAlmacenamiento() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/almacenamiento/mi-uso", { withCredentials: true })
      .then((res) => setDatos(res.data))
      .catch(() => setError("Error al cargar almacenamiento"))
      .finally(() => setCargando(false));
  }, []);

  const MB = 1_048_576;
  const usadoMb = datos?.usadoMb ?? 0;
  const cuotaMb = datos?.cuotaMb ?? null;
  const restantes = cuotaMb !== null ? cuotaMb - usadoMb : Infinity;
  const porcentaje =
    cuotaMb !== null && cuotaMb > 0
      ? Math.min(100, (usadoMb / cuotaMb) * 100)
      : 0;

  const usadoTexto = cargando ? "--" : `${usadoMb} MB`;
  const cuotaTexto =
    cuotaMb === null ? "Almacenamiento Infinito" : `${cuotaMb} MB`;
  const restantesTexto =
    cuotaMb === null ? "∞" : `${restantes < 0 ? 0 : restantes} MB`;

  return (
    <div className="w-full h-40 bg-gray-700 rounded-2xl">
      <div className="flex p-5 gap-2 items-center">
        <HardDrive color="#1A56DB" className="w-5 h-5" />
        <h2 className="text-white font-semibold text-1xl">Almacenamiento</h2>
      </div>

      {cargando ? (
        <p className="pl-5 text-gray-300 animate-pulse">Cargando…</p>
      ) : error ? (
        <p className="pl-5 text-red-400">{error}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5 pl-5">
            <h1 className="text-white font-bold text-2xl">{usadoTexto}</h1>
            <p className="text-gray-500 font-semibold">de {cuotaTexto}</p>
          </div>

          {cuotaMb !== null && (
            <>
              <div className="relative h-2 bg-gray-600 rounded mx-5 mt-3">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={porcentaje}
                  className="h-full bg-[#1A56DB] rounded transition-all duration-500"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>

              <div className="flex justify-between px-5 mt-2 text-sm">
                <span className="text-gray-400">
                  {restantesTexto} restantes
                </span>
                <button
                  onClick={() => navigate("/perfil")}
                  className="text-[#1A56DB] hover:underline"
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
