import React, { useEffect, useState } from "react";
import axios from "axios";

const TotalesCXC = ({ clienteId }) => {
  const [totales, setTotales] = useState({ debe: 0, haber: 0, saldo: 0 });

  useEffect(() => {
    const obtenerTotales = async () => {
      if (!clienteId) {
        setTotales({ debe: 0, haber: 0, saldo: 0 });
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:3000/api/cuentas-por-cobrar/totales/${clienteId}`
        );
        setTotales(response.data);
      } catch (error) {
        console.error("Error al obtener totales:", error);
        setTotales({ debe: 0, haber: 0, saldo: 0 });
      }
    };

    obtenerTotales();
  }, [clienteId]);

  return (
    <div className="mb-6 bg-gray-800 rounded-xl p-4 shadow-md">
      <h2 className="text-white text-md font-semibold mb-4">Totales</h2>
      <div className="flex items-center justify-between mb-3">
        <label className="text-white font-medium">Debe</label>
        <input
          type="text"
          readOnly
          value={totales.debe.toFixed(2)}
          className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-28"
        />
        <label className="text-white font-medium ml-4">Haber</label>
        <input
          type="text"
          readOnly
          value={totales.haber.toFixed(2)}
          className="bg-gray-700 text-white text-right border border-gray-600 rounded-lg px-3 py-1 w-28"
        />
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
