import { useEffect, useState } from "react";
import axios from "axios";

const DatosMonetarios = ({ gasto, setGasto }) => {
  const [tasaCambio, setTasaCambio] = useState("");
  const [montoUSD, setMontoUSD] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGasto((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const obtenerTasa = async () => {
      if (gasto.moneda === "VES") {
        try {
          const res = await axios.get(
            "https://ve.dolarapi.com/v1/dolares/oficial"
          );
          const tasa = res.data?.promedio;
          if (tasa) {
            setTasaCambio(tasa.toFixed(4));
            setGasto((prev) => ({ ...prev, tasa_cambio: tasa.toFixed(4) }));
          }
        } catch (error) {
          console.error("Error al obtener la tasa de cambio", error);
        }
      } else {
        setTasaCambio("");
        setMontoUSD("");
        setGasto((prev) => ({ ...prev, tasa_cambio: null }));
      }
    };

    obtenerTasa();
  }, [gasto.moneda, setGasto]);

  useEffect(() => {
    if (gasto.moneda === "VES" && gasto.subtotal && tasaCambio) {
      const usd = parseFloat(gasto.subtotal / tasaCambio).toFixed(2);
      setMontoUSD(usd);
    }
  }, [gasto.subtotal, tasaCambio, gasto.moneda]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800 p-6 rounded-xl shadow-md text-white">
      <div>
        <label className="text-sm mb-1 block">Moneda</label>
        <select
          name="moneda"
          value={gasto.moneda ?? "USD"}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600"
        >
          <option value="USD">USD (Dólares)</option>
          <option value="VES">VES (Bolívares)</option>
        </select>
      </div>

      <div>
        <label className="text-sm mb-1 block text-white">Subtotal</label>
        <input
          type="number"
          step="0.01"
          name="subtotal"
          value={gasto.subtotal ?? ""}
          onChange={handleChange}
          placeholder="0.00"
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
          onFocus={(e) => {
            if (e.target.value === "0.00" || e.target.value === "0") {
              e.target.select();
            }
          }}
        />
      </div>

      <div>
        <label className="text-sm mb-1 block">Porcentaje de IVA</label>
        <select
          name="porcentaje_iva"
          value={gasto.porcentaje_iva ?? ""}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600"
        >
          <option value="">Seleccione el porcentaje de IVA</option>
          <option value="0">0% (Exento)</option>
          <option value="8">8% (Reducido)</option>
          <option value="16">16% (No Exento)</option>
        </select>
      </div>

      {gasto.moneda === "VES" && (
        <>
          <div>
            <label className="text-sm mb-1 block">
              Tasa de Cambio (VES/1 USD)
            </label>
            <input
              type="text"
              value={tasaCambio}
              readOnly
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-400"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block">Equivalente en USD</label>
            <input
              type="text"
              value={montoUSD}
              readOnly
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-400"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DatosMonetarios;
