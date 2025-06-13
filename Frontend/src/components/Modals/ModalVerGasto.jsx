import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ModalVerGasto({ visible, onClose, gasto }) {
  if (!visible || !gasto) return null;

  const isBolivares = gasto.moneda === "VES";
  const isRechazado = gasto.estado === "rechazado";

  const mostrarMonto = (valor) => {
    if (valor === undefined || valor === null) return "0.00";
    const numero = parseFloat(valor);
    return isNaN(numero) ? "0.00" : numero.toFixed(2);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-3xl p-6 bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-4">
            <div className="flex justify-between items-center mr-6">
              <h2 className="text-xl font-semibold text-white">
                Gasto {gasto.codigo}
              </h2>
              <span
                className={`px-2 py-1 rounded-full text-sm font-medium ${
                  gasto.estado === "aprobado"
                    ? "bg-green-100 text-green-800"
                    : gasto.estado === "pendiente"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {gasto.estado}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm text-gray-300">
              <p>Proveedor: {gasto.proveedor || "-"}</p>
              <p>Fecha: {new Date(gasto.fecha).toLocaleDateString("es-VE")}</p>
              <p>Tipo de gasto: {gasto.tipo_gasto || "-"}</p>
              <p>Sucursal: {gasto.sucursal || "-"}</p>
              <p>Moneda: {gasto.moneda || "-"}</p>
              {isBolivares && (
                <p>Tasa de cambio: {gasto.tasa_cambio || "-"} BS</p>
              )}
              <p>Cotización asociada: {gasto.cotizacion_codigo || "-"}</p>
              <p>
                Porcentaje IVA:{" "}
                {gasto.porcentaje_iva ? `${gasto.porcentaje_iva}%` : "-"}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-300 mb-4">
            <p>
              <strong>Descripción:</strong> {gasto.descripcion || "-"}
            </p>
            <p>
              <strong>Concepto de pago:</strong> {gasto.concepto_pago || "-"}
            </p>
          </div>

          {isRechazado && gasto.motivo_rechazo && (
            <div className="bg-red-900/30 border border-red-700 rounded p-3 mb-4">
              <p className="font-semibold text-red-300">Motivo de rechazo:</p>
              <p className="text-red-200">{gasto.motivo_rechazo}</p>
            </div>
          )}

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-4 py-2">CONCEPTO</th>
                  {isBolivares && <th className="px-4 py-2">TASA DE CAMBIO</th>}
                  <th className="px-4 py-2">SUBTOTAL</th>
                  <th className="px-4 py-2">IMPUESTO</th>
                  <th className="px-4 py-2">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-600">
                  <td className="px-4 py-2">{gasto.concepto_pago}</td>
                  {isBolivares && (
                    <td className="px-4 py-2">
                      {gasto.tasa_cambio || "N/A"} BS
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {isBolivares
                      ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.subtotal)}`}
                  </td>
                  <td className="px-4 py-2">
                    {isBolivares
                      ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.impuesto)}`}
                  </td>
                  <td className="px-4 py-2">
                    {isBolivares
                      ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.total)}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-6 mt-4 text-sm text-gray-300">
            <div>
              <div className="flex justify-between">
                <span>Subtotal: </span>
                <span>
                  {isBolivares
                    ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                    : `$${mostrarMonto(gasto.subtotal)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>IVA: </span>
                <span>
                  {isBolivares
                    ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                    : `$${mostrarMonto(gasto.impuesto)}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total: </span>
                <span>
                  {isBolivares
                    ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                    : `$${mostrarMonto(gasto.total)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-right">
            <button
              onClick={onClose}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
