import { useEffect, useState, useRef } from "react";
import axios from "axios";

const DatosMonetarios = ({ gasto, setGasto }) => {
  const [tasaCambio, setTasaCambio] = useState("");
  const [montoUSD, setMontoUSD] = useState("");
  const [subtotalTexto, setSubtotalTexto] = useState("");

  const inputSubtotalRef = useRef(null);

  // ───── Helpers de formato LATAM ──────────────────────────────
  const formatearMontoLatamInput = (valor) => {
    if (!valor) return "";

    let limpio = valor.replace(/[^\d,]/g, "");

    const partes = limpio.split(",");
    let enteros = partes[0] || "";
    let decimales = partes[1] ?? "";

    decimales = decimales.slice(0, 2);

    enteros = enteros.replace(/^0+(?!$)/, "");
    if (enteros === "") enteros = "0";

    enteros = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return decimales !== "" ? `${enteros},${decimales}` : enteros;
  };

  const convertirLatamANumeroString = (valor) => {
    if (!valor) return "";
    let limpio = valor.replace(/[^\d,]/g, "");
    const partes = limpio.split(",");
    let enteros = partes[0] || "0";
    let decimales = partes[1] ? partes[1].slice(0, 2) : "";

    enteros = enteros.replace(/\./g, "");

    if (decimales === "") return enteros;
    return `${enteros}.${decimales}`;
  };

  // ───── Manejo de cambios ─────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "subtotal") {
      const input = inputSubtotalRef.current;
      const cursorPos = input.selectionStart;

      const formateado = formatearMontoLatamInput(value);
      setSubtotalTexto(formateado);

      const numeroString = convertirLatamANumeroString(formateado);
      setGasto((prev) => ({
        ...prev,
        subtotal: numeroString === "" ? "" : numeroString,
      }));

      setTimeout(() => {
        const inputActual = inputSubtotalRef.current;
        if (inputActual) {
          const nuevaLongitud = formateado.length;
          const compensacion = nuevaLongitud - value.length;

          inputActual.selectionStart = inputActual.selectionEnd =
            cursorPos + compensacion;
        }
      }, 0);

      return;
    }

    setGasto((prev) => ({ ...prev, [name]: value }));
  };

  // ───── Sincronizar texto si subtotal cambia externamente ─────
  useEffect(() => {
    if (gasto.subtotal !== "" && gasto.subtotal !== null) {
      const num = Number(gasto.subtotal);
      if (!isNaN(num)) {
        const formateado = num.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setSubtotalTexto(formateado);
      }
    } else {
      setSubtotalTexto("");
    }
  }, [gasto.subtotal]);

  // ───── Obtener tasa de cambio ────────────────────────────────
  useEffect(() => {
    const obtenerTasa = async () => {
      if (gasto.moneda === "VES") {
        try {
          const res = await axios.get(
            "https://ve.dolarapi.com/v1/dolares/oficial"
          );
          const tasa = res.data?.promedio;
          if (tasa) {
            const tasaRedondeada = Number(tasa).toFixed(2);
            setTasaCambio(tasaRedondeada);
            setGasto((prev) => ({ ...prev, tasa_cambio: tasaRedondeada }));
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

  // ───── Calcular equivalente USD ──────────────────────────────
  useEffect(() => {
    if (gasto.moneda === "VES" && gasto.subtotal && tasaCambio) {
      const subtotalNum = Number(gasto.subtotal);
      const tasaNum = Number(tasaCambio);
      if (!isNaN(subtotalNum) && !isNaN(tasaNum) && tasaNum > 0) {
        const usd = (subtotalNum / tasaNum).toFixed(2);
        setMontoUSD(usd);
      } else {
        setMontoUSD("");
      }
    } else {
      setMontoUSD("");
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
          className="cursor-pointer w-full p-2 rounded bg-gray-700 border border-gray-600"
        >
          <option value="USD">USD (Dólares)</option>
          <option value="VES">VES (Bolívares)</option>
        </select>
      </div>

      <div>
        <label className="text-sm mb-1 block text-white">Subtotal</label>
        <input
          ref={inputSubtotalRef}
          type="text"
          name="subtotal"
          value={subtotalTexto}
          onChange={handleChange}
          placeholder="0,00"
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
        />
      </div>

      <div>
        <label className="text-sm mb-1 block">Porcentaje de IVA</label>
        <select
          name="porcentaje_iva"
          value={gasto.porcentaje_iva ?? ""}
          onChange={handleChange}
          className="cursor-pointer w-full p-2 rounded bg-gray-700 border border-gray-600"
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
              value={
                tasaCambio
                  ? Number(tasaCambio).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""
              }
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
