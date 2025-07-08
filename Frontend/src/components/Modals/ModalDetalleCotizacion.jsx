import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function ModalDetalleCotizacion({
  visible,
  onClose,
  cotizacion,
}) {
  if (!visible || !cotizacion) return null;

  const {
    codigo,
    cliente_nombre,
    fecha,
    estado,
    sucursal,
    observaciones,
    confirmacion_cliente,
    subtotal,
    impuesto,
    total,
    detalle = [],
    motivo_rechazo,
    operacion,
    mercancia,
    bl,
    contenedor,
    puerto,
    declarante,
  } = cotizacion;

  const isRechazado = estado === "rechazada";
  const isAprobado = estado === "aprobada";
  const isPendiente = estado === "pendiente";

  const mostrarMonto = (valor) => {
    if (valor === undefined || valor === null) return "0.00";
    const numero = parseFloat(valor);
    return isNaN(numero) ? "0.00" : numero.toFixed(2);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-VE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
          className="relative w-full max-w-5xl p-6 bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Encabezado */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">
                  Cotización #{codigo}
                </h2>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Fecha: {formatearFecha(fecha)}
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
              <span className="capitalize">{estado}</span>
            </div>
          </div>

          {/* Contenido principal en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda - Información básica */}
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
                  Información Básica
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <span className="text-gray-400">Cliente:</span>{" "}
                    <span className="font-medium">
                      {cliente_nombre || "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Sucursal:</span>{" "}
                    <span className="font-medium">{sucursal || "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Declarante:</span>{" "}
                    <span className="font-medium">{declarante || "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Confirmación:</span>{" "}
                    <span className="font-medium">
                      {confirmacion_cliente ? "Sí" : "No"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                  <span className="w-3 h-3 bg-purple-400 rounded-full mr-2"></span>
                  Operación
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <span className="text-gray-400">Tipo:</span>{" "}
                    <span className="font-medium">{operacion || "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Mercancía:</span>{" "}
                    <span className="font-medium">{mercancia || "N/A"}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Contenedor:</span>{" "}
                    <span className="font-medium">
                      {contenedor ? `${contenedor} || "N/A"}` : "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">BL:</span>{" "}
                    <span className="font-medium">
                      {bl ? `${bl} || "N/A"}` : "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Puerto:</span>{" "}
                    <span className="font-medium">{puerto || "N/A"}</span>
                  </p>
                </div>
              </div>

              {/* Motivo de rechazo */}
              {isRechazado && (
                <div className="bg-red-900/30 p-4 rounded-lg border border-red-700">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-300 mb-1">
                        Motivo de rechazo
                      </h4>
                      <span className="text-red-400 italic">
                        {motivo_rechazo}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Columna central - Detalles adicionales y tabla */}
            <div className="lg:col-span-2 space-y-4">
              {/* Observaciones */}
              {observaciones && (
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                    <span className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></span>
                    Observaciones
                  </h3>
                  <p className="text-sm text-gray-300">{observaciones}</p>
                </div>
              )}

              {/* Tabla de detalles */}
              <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                <table className="w-full text-sm text-gray-300">
                  <thead className="bg-gray-600">
                    <tr className="text-left font-medium border-b border-gray-500">
                      <th className="p-3">Servicio/Producto</th>
                      <th className="p-3">Cantidad</th>
                      <th className="p-3 text-right">Precio U.</th>
                      <th className="p-3 text-right">IVA %</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-600 hover:bg-gray-600/50"
                      >
                        <td className="p-3">{item.servicio}</td>
                        <td className="p-3">{item.cantidad}</td>
                        <td className="p-3 text-right">
                          ${mostrarMonto(item.precio_unitario)}
                        </td>
                        <td className="p-3 text-right">
                          {item.porcentaje_iva || 0}%
                        </td>
                        <td className="p-3 text-right font-medium text-blue-400">
                          ${mostrarMonto(item.total)}
                        </td>
                      </tr>
                    ))}
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
                        ${mostrarMonto(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA:</span>
                      <span className="font-medium">
                        ${mostrarMonto(impuesto)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-600 flex justify-between text-base font-bold text-blue-400">
                      <span>Total:</span>
                      <span>${mostrarMonto(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="cursor-pointer px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium mr-2"
            >
              Cerrar
            </button>
            <a
              href={`${api.defaults.baseURL}/cotizaciones/${cotizacion.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
