import React, { useEffect, useState } from "react";
import api from "../../api/index";

const TotalesCXC = ({ clienteId, refreshKey }) => {
  const [totales, setTotales] = useState({ debe: 0, haber: 0, saldo: 0 });

  useEffect(() => {
    const obtenerTotales = async () => {
      if (!clienteId) {
        setTotales({ debe: 0, haber: 0, saldo: 0 });
        return;
      }
      try {
        const response = await api.get(`/cuentas/totales/${clienteId}`);
        setTotales(response.data);
      } catch (error) {
        console.error("Error al obtener totales:", error);
        setTotales({ debe: 0, haber: 0, saldo: 0 });
      }
    };

    obtenerTotales();
  }, [clienteId, refreshKey]);

  return (
    <div className="mb-6 bg-gray-800 rounded-xl p-4 shadow-md">
      <h2 className="text-white text-md font-semibold mb-4">Totales</h2>

      {/* Primera fila: Debe y Haber */}
      <div className="flex flex-col sm:flex-row gap-4 mb-3">
        <div className="flex-1 flex items-center justify-between sm:justify-start">
          <label className="text-white font-medium mr-2 whitespace-nowrap">
            Debe
          </label>
          <input
            type="text"
            readOnly
            value={totales.debe.toFixed(2)}
            className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-28"
          />
        </div>

        <div className="flex-1 flex items-center justify-between sm:justify-start">
          <label className="text-white font-medium mr-2 whitespace-nowrap">
            Haber
          </label>
          <input
            type="text"
            readOnly
            value={totales.haber.toFixed(2)}
            className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-28"
          />
        </div>
      </div>

      {/* Segunda fila: Saldo (ocupando todo el ancho) */}
      <div className="flex items-center justify-between mt-4">
        <label className="text-white font-medium whitespace-nowrap">
          Saldo
        </label>
        <input
          type="text"
          readOnly
          value={totales.saldo.toFixed(2)}
          className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-28 sm:w-36"
        />
      </div>
    </div>
  );
};

export default TotalesCXC;
