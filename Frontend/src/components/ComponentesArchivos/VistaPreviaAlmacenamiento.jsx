// src/components/ComponentesArchivos/VistaPreviaAlmacenamiento.jsx
import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import api from "../../api"; // misma instancia Axios que usas en otros módulos

function VistaPreviaAlmacenamiento() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/almacenamiento/mi-uso", { withCredentials: true })
      .then((res) => setDatos(res.data))
      .catch(() => setError("Error al cargar almacenamiento"))
      .finally(() => setCargando(false));
  }, []);

  /* ----------- valores a mostrar ----------- */
  const usadoTexto = datos?.usadoMb !== undefined ? `${datos.usadoMb}Mb` : "--";
  const cuotaTexto =
    datos?.cuotaMb === null
      ? "∞"
      : datos?.cuotaMb !== undefined
      ? `${datos.cuotaMb}Mb`
      : "--";

  return (
    <>
      <div className="absolute top-2 left-6.5 w-69 h-40 bg-gray-700 rounded-2xl">
        {/* Encabezado */}
        <div className="flex p-5 gap-2 items-center">
          <HardDrive color="#1A56DBFF" className="w-5 h-5" />
          <h2 className="text-white font-semibold">Almacenamiento</h2>
        </div>

        {/* Métricas */}
        {cargando ? (
          <p className="pl-5 text-gray-300 animate-pulse">Cargando…</p>
        ) : error ? (
          <p className="pl-5 text-red-400">{error}</p>
        ) : (
          <div className="flex items-baseline gap-1.5 pl-5">
            <h1 className="text-white font-bold text-2xl">{usadoTexto}</h1>
            <p className="text-gray-500 font-semibold">de {cuotaTexto}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default VistaPreviaAlmacenamiento;
