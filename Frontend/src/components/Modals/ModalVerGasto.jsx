import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function ModalVerGasto({ visible, onClose, gasto }) {
  if (!visible || !gasto) return null;

  const isBolivares = gasto.moneda === "VES";
  const isRechazado = gasto.estado === "rechazado";
  const isAprobado = gasto.estado === "aprobado";

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
          className="relative w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Encabezado */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-blue-400 mr-2" />
              <h2 className="text-xl font-semibold text-white">
                Gasto #{gasto.codigo}
              </h2>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                isAprobado
                  ? "bg-green-900 text-green-200"
                  : isRechazado
                  ? "bg-red-900 text-red-200"
                  : "bg-yellow-900 text-yellow-200"
              }`}
            >
              {gasto.estado}
            </span>
          </div>

          <p className="text-sm text-gray-300 mb-4">
            Registrado el{" "}
            {new Date(gasto.fecha).toLocaleDateString("es-VE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>

          {/* Información en 2 columnas */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Proveedor:</p>
              <p className="text-white">{gasto.proveedor || "-"}</p>

              <p className="text-sm text-gray-400">Sucursal:</p>
              <p className="text-white">{gasto.sucursal || "-"}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Tipo de gasto:</p>
              <p className="text-white">{gasto.tipo_gasto || "-"}</p>

              <p className="text-sm text-gray-400">Moneda:</p>
              <p className="text-white">{gasto.moneda || "-"}</p>
            </div>
          </div>

          {/* Concepto y descripción */}
          <div className="mb-4">
            <p className="text-sm text-gray-400">Concepto de pago:</p>
            <p className="text-white mb-3">{gasto.concepto_pago || "-"}</p>

            <p className="text-sm text-gray-400">Descripción:</p>
            <p className="text-white">{gasto.descripcion || "-"}</p>
          </div>

          {/* Tabla compacta */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs uppercase bg-gray-700 text-gray-300">
                <tr>
                  <th className="px-3 py-2">Concepto</th>
                  {isBolivares && <th className="px-3 py-2">Tasa</th>}
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-right">Impuesto</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="px-3 py-2">{gasto.concepto_pago}</td>
                  {isBolivares && (
                    <td className="px-3 py-2">
                      {gasto.tasa_cambio || "N/A"} BS
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">
                    {isBolivares
                      ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.subtotal)}`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isBolivares
                      ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.impuesto)}`}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-400">
                    {isBolivares
                      ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.total)}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          <div className="bg-gray-700 p-3 rounded-lg mb-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Subtotal:</span>
                  <span>
                    {isBolivares
                      ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.subtotal)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">IVA:</span>
                  <span>
                    {isBolivares
                      ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.impuesto)}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-600 flex justify-between font-bold">
                  <span className="text-white">Total:</span>
                  <span className="text-blue-400">
                    {isBolivares
                      ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.total)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
            >
              Cerrar
            </button>
            {gasto.documento && (
              <a
                href={gasto.urlFacturaFirmada || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
              >
                Ver Documento
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
