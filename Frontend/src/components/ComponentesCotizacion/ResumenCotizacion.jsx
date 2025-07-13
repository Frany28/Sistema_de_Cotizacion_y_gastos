import React from "react";

export default function ResumenCotizacion({ items = [], onGenerar }) {
  const safeValue = (value) => (isNaN(value) ? "0.00" : value.toFixed(2));

  // Calcular subtotal sin IVA
  const subtotalSinIva = items.reduce(
    (sum, item) => sum + (item.precio || 0) * (item.cantidad || 0),
    0
  );

  // Calcular impuestos total
  const totalImpuestos = items.reduce((sum, item) => {
    const porcentaje = item.porcentaje_iva || 0;
    const subtotalItem = (item.precio || 0) * (item.cantidad || 0);
    const ivaItem = (subtotalItem * porcentaje) / 100;
    return sum + ivaItem;
  }, 0);

  // Calcular total general
  const totalGeneral = subtotalSinIva + totalImpuestos;

  return (
    <div className="w-full bg-gray-800 rounded-xl p-4 md:p-6 shadow-md lg:sticky lg:top-4">
      <h3 className="text-white text-lg font-semibold mb-4">
        Resumen de Cotización
      </h3>

      <div className="text-sm text-gray-300 space-y-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${safeValue(subtotalSinIva)}</span>
        </div>

        <div className="flex justify-between">
          <span>IVA</span>
          <span>${safeValue(totalImpuestos)}</span>
        </div>

        <div className="flex justify-between font-bold text-white border-t border-gray-700 pt-3">
          <span>Total</span>
          <span>${safeValue(totalGeneral)}</span>
        </div>
      </div>

      <button
        onClick={onGenerar}
        className="cursor-pointer mt-4 md:mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm md:text-base"
      >
        Generar Cotización
      </button>
    </div>
  );
}
