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
          className="relative w-full max-w-2xl p-6 bg-gray-50 rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Encabezado */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-800">
                  Gasto #{gasto.codigo}
                </h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Registrado el{" "}
                {new Date(gasto.fecha).toLocaleDateString("es-VE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isAprobado
                  ? "bg-green-100 text-green-800"
                  : isRechazado
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <EstadoIcon />
              <span className="capitalize">{gasto.estado}</span>
            </div>
          </div>

          {/* Grid de información */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Información Básica
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-500">Proveedor:</span>{" "}
                  <span className="font-medium">{gasto.proveedor || "-"}</span>
                </p>
                <p>
                  <span className="text-gray-500">Sucursal:</span>{" "}
                  <span className="font-medium">{gasto.sucursal || "-"}</span>
                </p>
                <p>
                  <span className="text-gray-500">Tipo de gasto:</span>{" "}
                  <span className="font-medium">{gasto.tipo_gasto || "-"}</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Detalles Financieros
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-500">Moneda:</span>{" "}
                  <span className="font-medium">{gasto.moneda || "-"}</span>
                </p>
                {isBolivares && (
                  <p>
                    <span className="text-gray-500">Tasa de cambio:</span>{" "}
                    <span className="font-medium">
                      {gasto.tasa_cambio || "-"} BS
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-gray-500">IVA:</span>{" "}
                  <span className="font-medium">
                    {gasto.porcentaje_iva ? `${gasto.porcentaje_iva}%` : "-"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Descripción y concepto */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-medium text-gray-700 mb-2 flex items-center">
              <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
              Detalles Adicionales
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Concepto de pago:</p>
                <p className="font-medium">{gasto.concepto_pago || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Descripción:</p>
                <p className="font-medium text-gray-700">
                  {gasto.descripcion || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Motivo de rechazo */}
          {isRechazado && gasto.motivo_rechazo && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-700 mb-1">
                    Motivo de rechazo
                  </h4>
                  <p className="text-red-600 text-sm">{gasto.motivo_rechazo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de montos */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500 font-medium border-b border-gray-200">
                  <th className="p-3">Concepto</th>
                  {isBolivares && <th className="p-3">Tasa</th>}
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">Impuesto</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 last:border-0">
                  <td className="p-3 font-medium text-gray-700">
                    {gasto.concepto_pago}
                  </td>
                  {isBolivares && (
                    <td className="p-3 text-gray-500">
                      {gasto.tasa_cambio || "N/A"} BS
                    </td>
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
                  <td className="p-3 text-right font-medium text-blue-600">
                    {isBolivares
                      ? `${mostrarMonto(gasto.total * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.total)}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumen */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {isBolivares
                      ? `${mostrarMonto(gasto.subtotal * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.subtotal)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA:</span>
                  <span className="font-medium">
                    {isBolivares
                      ? `${mostrarMonto(gasto.impuesto * gasto.tasa_cambio)} BS`
                      : `$${mostrarMonto(gasto.impuesto)}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-blue-200 flex justify-between text-base font-bold text-blue-700">
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
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium mr-2"
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
