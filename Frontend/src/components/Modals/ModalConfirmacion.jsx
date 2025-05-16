// src/components/Modals/ModalConfirmacion.jsx
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";

export default function ModalConfirmacion({
  visible,
  onClose,
  onConfirmar,
  titulo = "¿Estás seguro?",
  mensaje = "Esta acción no se puede deshacer.",
  textoConfirmar = "Sí, eliminar",
  textoCancelar = "Cancelar",
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
            className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 text-red-500 w-12 h-12" />
              <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
                {titulo}
              </h3>
              <p className="mb-5 text-sm text-gray-500 dark:text-gray-300">
                {mensaje}
              </p>

              <button
                onClick={onConfirmar}
                className="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2"
              >
                {textoConfirmar}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                {textoCancelar}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
