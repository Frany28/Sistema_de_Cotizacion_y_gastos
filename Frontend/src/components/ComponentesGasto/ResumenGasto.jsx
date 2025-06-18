import React from "react";

export default function ResumenGasto({ gasto = {}, onRegistrar }) {
  const safeValue = (val) => (isNaN(val) ? "0.00" : parseFloat(val).toFixed(2));

  const subtotal = parseFloat(gasto.subtotal) || 0;
  const porcentaje_iva = parseFloat(gasto.porcentaje_iva) || 0;
  const tasaCambio = parseFloat(gasto.tasa_cambio) || 0;

  const impuesto =
    gasto.impuesto !== undefined
      ? parseFloat(gasto.impuesto)
      : subtotal * (porcentaje_iva / 100);

  const total =
    gasto.total !== undefined ? parseFloat(gasto.total) : subtotal + impuesto;

  const totalBs =
    gasto.moneda === "USD" && tasaCambio > 0 ? total * tasaCambio : null;

  const obtenerSimbolo = (moneda) => (moneda === "VES" ? "Bs" : "$");

 

  return (
    <div className="w-full bg-gray-800 rounded-xl p-6 shadow-md">
      <h3 className="text-white text-lg font-semibold mb-4">
        Resumen del Gasto
      </h3>

      <div className="text-sm text-gray-300 space-y-3 mb-6">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>
            {obtenerSimbolo(gasto.moneda)} {safeValue(subtotal)}
          </span>
        </div>

        <div className="flex justify-between">
          <span>IVA ({porcentaje_iva}%)</span>
          <span>
            {obtenerSimbolo(gasto.moneda)} {safeValue(impuesto)}
          </span>
        </div>

        <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-3">
          <span>Total</span>
          <span>
            {obtenerSimbolo(gasto.moneda)} {safeValue(total)}
          </span>
        </div>

        {totalBs && (
          <div className="flex justify-between text-green-400">
            <span>Total en Bolívares (VES)</span>
            <span>Bs. {safeValue(totalBs)}</span>
          </div>
        )}
      </div>

      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition cursor-pointer"
        onClick={onRegistrar}
      >
        Registrar solicitud de gasto
      </button>
    </div>
  );
}
