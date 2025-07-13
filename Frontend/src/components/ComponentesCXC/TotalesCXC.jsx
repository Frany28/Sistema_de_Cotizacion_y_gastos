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

  return (
    <div className="mb-6 bg-gray-800 rounded-xl p-4 shadow-md">
      <h2 className="text-white text-md font-semibold mb-4">Totales</h2>

      {/* Contenedor principal con diseño responsivo */}
      <div className="space-y-4">
        {/* Primera fila - Debe y Haber */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Debe */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <label className="text-white font-medium mb-1 sm:mb-0 sm:mr-2 whitespace-nowrap">
              Debe
            </label>
            <input
              type="text"
              readOnly
              value={isLoading ? "Cargando..." : totales.debe.toFixed(2)}
              className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-full sm:w-28"
              aria-label="Total debe"
            />
          </div>

          {/* Haber */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <label className="text-white font-medium mb-1 sm:mb-0 sm:mr-2 whitespace-nowrap">
              Haber
            </label>
            <input
              type="text"
              readOnly
              value={isLoading ? "Cargando..." : totales.haber.toFixed(2)}
              className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-full sm:w-28"
              aria-label="Total haber"
            />
          </div>
        </div>

        {/* Segunda fila - Saldo */}
        <div className="pt-3 border-t border-gray-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <label className="text-white font-medium mb-1 sm:mb-0 whitespace-nowrap">
              Saldo
            </label>
            <input
              type="text"
              readOnly
              value={isLoading ? "Cargando..." : totales.saldo.toFixed(2)}
              className={`bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-full sm:w-36 ${
                totales.saldo < 0 ? "text-red-400" : "text-green-400"
              }`}
              aria-label="Saldo total"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalesCXC;
