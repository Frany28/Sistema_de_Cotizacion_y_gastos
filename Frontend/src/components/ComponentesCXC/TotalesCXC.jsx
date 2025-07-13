import React, { useEffect, useState } from "react";
import api from "../../api/index";

const TotalesCXC = ({ clienteId, refreshKey }) => {
  const [totales, setTotales] = useState({ debe: 0, haber: 0, saldo: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const obtenerTotales = async () => {
      if (!clienteId) {
        setTotales({ debe: 0, haber: 0, saldo: 0 });
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get(`/cuentas/totales/${clienteId}`);
        setTotales(response.data);
      } catch (error) {
        console.error("Error al obtener totales:", error);
        setTotales({ debe: 0, haber: 0, saldo: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    obtenerTotales();
  }, [clienteId, refreshKey]);

  const formatoMonto = (monto) =>
    isLoading ? "Cargando..." : monto.toFixed(2);

  return (
    <div className="mb-6 rounded-xl bg-gray-800 p-4 shadow-md">
      <h2 className="mb-4 text-md font-semibold text-white">Totales</h2>

      {/* Contenedor responsivo */}
      <div className="grid gap-3 sm:gap-4">
        {/* Debe */}
        <div className="flex flex-col items-stretch rounded-lg bg-gray-700/40 px-4 py-3 sm:bg-transparent sm:px-0 sm:py-0 sm:flex-row sm:items-center sm:justify-between">
          <label className="mb-1 text-center text-white font-medium sm:mb-0 sm:mr-2 sm:text-left whitespace-nowrap">
            Debe
          </label>
          <input
            type="text"
            readOnly
            value={formatoMonto(totales.debe)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-center text-lg text-white sm:w-32 sm:text-right sm:text-base"
            aria-label="Total debe"
          />
        </div>

        {/* Haber */}
        <div className="flex flex-col items-stretch rounded-lg bg-gray-700/40 px-4 py-3 sm:bg-transparent sm:px-0 sm:py-0 sm:flex-row sm:items-center sm:justify-between">
          <label className="mb-1 text-center text-white font-medium sm:mb-0 sm:mr-2 sm:text-left whitespace-nowrap">
            Haber
          </label>
          <input
            type="text"
            readOnly
            value={formatoMonto(totales.haber)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-center text-lg text-white sm:w-32 sm:text-right sm:text-base"
            aria-label="Total haber"
          />
        </div>

        {/* Saldo */}
        <div className="flex flex-col items-stretch rounded-lg bg-gray-700/40 px-4 py-3 sm:bg-transparent sm:px-0 sm:py-0 sm:flex-row sm:items-center sm:justify-between sm:border-t sm:border-gray-700 sm:pt-3">
          <label className="mb-1 text-center text-white font-medium sm:mb-0 sm:text-left whitespace-nowrap">
            Saldo
          </label>
          <input
            type="text"
            readOnly
            value={formatoMonto(totales.saldo)}
            className={`w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-center text-lg sm:w-40 sm:text-right sm:text-base ${
              totales.saldo < 0 ? "text-red-400" : "text-green-400"
            }`}
            aria-label="Saldo total"
          />
        </div>
      </div>
    </div>
  );
};

export default TotalesCXC;
