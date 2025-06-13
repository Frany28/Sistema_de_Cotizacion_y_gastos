import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function ModalVerGasto({ visible, onClose, gasto }) {
  if (!visible || !gasto) return null;

  const isBolivares = gasto.moneda === "VES";
  const isRechazado = gasto.estado === "rechazado";
  const isAprobado = gasto.estado === "aprobado";
  const isPendiente = gasto.estado === "pendiente";

  const mostrarMonto = (valor) => {
    if (valor === undefined || valor === null) return "0.00";
    const numero = parseFloat(valor);
    return isNaN(numero) ? "0.00" : numero.toFixed(2);
  };

  const EstadoIcon = () => {
    if (isAprobado) return <CheckCircle2 className="w-4 h-4 mr-1" />;
    if (isRechazado) return <AlertCircle className="w-4 h-4 mr-1" />;
    return <Clock className="w-4 h-4 mr-1" />;
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
          className="relative w-full max-w-4xl p-6 bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Encabezado */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">
                  Gasto #{gasto.codigo}
                </h2>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Registrado el{" "}
                {new Date(gasto.fecha).toLocaleDateString("es-VE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isAprobado
                  ? "bg-green-100 text-green-800"
                  : isRechazado
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              <EstadoIcon />
              <span className="capitalize">{gasto.estado}</span>
            </div>
          </div>

          {/* Grid de información */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
                Información Básica
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <span className="text-gray-400">Proveedor:</span>{" "}
                  <span className="font-medium">{gasto.proveedor || "-"}</span>
                </p>
                <p>
                  <span className="text-gray-400">Sucursal:</span>{" "}
                  <span className="font-medium">{gasto.sucursal || "-"}</span>
                </p>
                <p>
                  <span className="text-gray-400">Tipo de gasto:</span>{" "}
                  <span className="font-medium">{gasto.tipo_gasto || "-"}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                <span className="w-3 h-3 bg-purple-400 rounded-full mr-2"></span>
                Detalles Financieros
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <span className="text-gray-400">Moneda:</span>{" "}
                  <span className="font-medium">{gasto.moneda || "-"}</span>
                </p>
                {isBolivares && (
                  <p>
                    <span className="text-gray-400">Tasa de cambio:</span>{" "}
                    <span className="font-medium">
                      {gasto.tasa_cambio || "-"} BS
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-gray-400">IVA:</span>{" "}
                  <span className="font-medium">
                    {gasto.porcentaje_iva ? `${gasto.porcentaje_iva}%` : "-"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Descripción y concepto */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 mb-4">
            <h3 className="font-medium text-gray-300 mb-2 flex items-center">
              <span className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></span>
              Detalles Adicionales
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <p className="text-gray-400">Concepto de pago:</p>
                <p className="font-medium">{gasto.concepto_pago || "-"}</p>
              </div>
              <div>
                <p className="text-gray-400">Descripción:</p>
                <p className="font-medium">{gasto.descripcion || "-"}</p>
              </div>
            </div>
          </div>

          {/* Motivo de rechazo */}
          {isRechazado && gasto.motivo_rechazo && (
            <div className="bg-red-900/30 p-4 rounded-lg border border-red-700 mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-300 mb-1">
                    Motivo de rechazo
                  </h4>
                  <p className="text-red-400 text-sm">{gasto.motivo_rechazo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de montos */}
          <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden mb-4">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-gray-600">
                <tr className="text-left font-medium border-b border-gray-500">
                  <th className="p-3">Concepto</th>
                  {isBolivares && <th className="p-3">Tasa</th>}
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">Impuesto</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-600 last:border-0">
                  <td className="p-3 font-medium">{gasto.concepto_pago}</td>
                  {isBolivares && (
                    <td className="p-3">{gasto.tasa_cambio || "N/A"} BS</td>
                  )}
                  <td className="p-3 text-right font-medium">
                    {isBolivares
                      ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.subtotal)}`}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {isBolivares
                      ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.impuesto)}`}
                  </td>
                  <td className="p-3 text-right font-medium text-blue-400">
                    {isBolivares
                      ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.total)}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-gray-300">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    {isBolivares
                      ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.subtotal)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA:</span>
                  <span className="font-medium">
                    {isBolivares
                      ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.impuesto)}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-600 flex justify-between text-base font-bold text-blue-400">
                  <span>Total:</span>
                  <span>
                    {isBolivares
                      ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.total)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium mr-2"
            >
              Cerrar
            </button>
            {gasto.documento && (
              <a
                href={gasto.urlFacturaFirmada || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
