import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Check, XCircle, AlertTriangle } from "lucide-react";

export default function ModalCambioEstado({
  visible,
  onClose,
  titulo = "Cambiar Estado",
  mensaje = "Seleccione un nuevo estado:",
  onSeleccionar,
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative p-6 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 p-2 mx-auto mb-4 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>

            <p className="mb-2 text-lg font-semibold text-blue-700 dark:text-blue-400">
              {titulo}
            </p>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              {mensaje}
            </p>

            <div className="grid grid-cols-3 gap-4 justify-center">
              {/* Aprobar */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onSeleccionar("aprobada")}
                  className="w-16 h-16 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center shadow-md"
                >
                  <Check className="w-8 h-8 text-white" />
                </button>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Aprobar
                </p>
              </div>

              {/* Rechazar */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onSeleccionar("rechazada")}
                  className="w-16 h-16 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center shadow-md"
                >
                  <XCircle className="w-8 h-8 text-white" />
                </button>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Rechazar
                </p>
              </div>

              {/* Pendiente */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onSeleccionar("pendiente")}
                  className="w-16 h-16 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center shadow-md"
                >
                  <AlertTriangle className="w-8 h-8 text-white" />
                </button>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Pendiente
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-6 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-gray-600 rounded-lg focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700"
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
