import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye } from "lucide-react";

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
  } = cotizacion;

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
          className="relative w-full max-w-3xl p-6  bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="cursor-pointer absolute top-3 right-3 text-gray-400  hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-4">
            <div className="flex justify-between items-center mr-6">
              <h2 className="text-xl font-semibold  text-white">
                Cotización {codigo}
              </h2>
              <span
                className={`px-2 py-1 rounded-full text-sm font-medium  ${
                  estado === "aprobada"
                    ? "bg-green-100 text-green-800"
                    : estado === "pendiente"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {estado}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              Cliente: {cliente_nombre} • Fecha:{" "}
              {new Date(fecha).toLocaleDateString("es-VE")}
            </p>
            <p className="text-sm  text-gray-300">
              Sucursal: {sucursal || "-"}
            </p>
            <p className="text-sm  text-gray-300">
              Confirmación por el cliente: {confirmacion_cliente ? "Sí" : "No"}
            </p>
            {observaciones && (
              <p className="mt-2 text-sm  text-gray-400">
                <strong>Observaciones:</strong> {observaciones}
              </p>
            )}
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left 0 text-gray-400">
              <thead className="text-xs  uppercase  bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-4 py-2">Servicio/Producto</th>
                  <th className="px-4 py-2">Cantidad</th>
                  <th className="px-4 py-2">Precio U.</th>
                  <th className="px-4 py-2">IVA %</th>
                  <th className="px-4 py-2">Subtotal</th>
                  <th className="px-4 py-2">Impuesto</th>
                  <th className="px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-600">
                    <td className="px-4 py-2">{item.servicio}</td>
                    <td className="px-4 py-2">{item.cantidad}</td>
                    <td className="px-4 py-2">
                      ${mostrarMonto(item.precio_unitario)}
                    </td>
                    <td className="px-4 py-2">
                      {item.porcentaje_iva !== undefined &&
                      item.porcentaje_iva !== null
                        ? `${item.porcentaje_iva}%`
                        : "0%"}
                    </td>

                    <td className="px-4 py-2">
                      ${mostrarMonto(item.subtotal)}
                    </td>
                    <td className="px-4 py-2">
                      ${mostrarMonto(item.impuesto)}
                    </td>
                    <td className="px-4 py-2">${mostrarMonto(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-6 mt-4 text-sm  text-gray-300">
            <div>
              <div className="flex justify-between">
                <span>Subtotal: </span>
                <span>${mostrarMonto(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA: </span>
                <span>${mostrarMonto(impuesto)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total: </span>
                <span> ${mostrarMonto(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-right">
            <a
              href={`${api.defaults.baseURL}/cotizaciones/${cotizacion.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
            >
              Ver PDF
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
