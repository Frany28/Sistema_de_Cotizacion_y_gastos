import React from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ModalVerGasto({ visible, onClose, gasto }) {
  if (!visible || !gasto) return null;

  const isBolivares = gasto.moneda === "VES";

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
          className="relative w-full max-w-3xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-semibold text-gray-100 mb-4">
            Detalles del Gasto
          </h2>

          <div className="text-sm text-gray-400 dark:text-gray-300">
            <p>
              <strong>Proveedor:</strong> {gasto.proveedor || "—"}
            </p>
            <p>
              <strong>Fecha:</strong>{" "}
              {new Date(gasto.fecha).toLocaleDateString("es-VE")}
            </p>
            <p>
              <strong>Sucursal:</strong> {gasto.sucursal || "—"}
            </p>
            <p>
              <strong>Descripción:</strong> {gasto.descripcion || "—"}
            </p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-700 ">
                <tr>
                  <th className="px-4 py-2">CONCEPTO</th>
                  {isBolivares && <th className="px-4 py-2">TASA DE CAMBIO</th>}
                  <th className="px-4 py-2">SUBTOTAL</th>
                  <th className="px-4 py-2">IMPUESTO</th>
                  <th className="px-4 py-2">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b dark:border-gray-600">
                  <td className="px-4 py-2">{gasto.concepto_pago}</td>
                  {isBolivares && <td>{gasto.tasa_cambio || "N/A"} BS</td>}
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

          <div className="flex justify-end gap-6 mt-4 text-sm text-gray-200">
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
                <span>Total:</span>
                <span>
                  {isBolivares
                    ? ` ${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                    : ` $${mostrarMonto(gasto.total)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
