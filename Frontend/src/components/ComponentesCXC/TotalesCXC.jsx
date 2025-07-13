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

      <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:justify-between mb-3">
        <div className="md:flex md:items-center">
          <label className="text-white font-medium block md:inline md:mr-2">
            Debe
          </label>
          <input
            type="text"
            readOnly
            value={totales.debe.toFixed(2)}
            className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-full md:w-28"
          />
        </div>

        <div className="md:flex md:items-center">
          <label className="text-white font-medium block md:inline md:mr-2 md:ml-4">
            Haber
          </label>
          <input
            type="text"
            readOnly
            value={totales.haber.toFixed(2)}
            className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-full md:w-28"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-white font-medium block mb-1">Saldo</label>
        <input
          type="text"
          readOnly
          value={totales.saldo.toFixed(2)}
          className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-full"
        />
      </div>
    </div>
  );
};

export default TotalesCXC;
