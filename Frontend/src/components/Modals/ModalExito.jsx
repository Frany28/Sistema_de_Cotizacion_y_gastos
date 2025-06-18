// src/components/Modals/ModalExito.jsx
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";

export default function ModalExito({
  visible,
  onClose,
  titulo = "¡Acción completada!",
  mensaje = "Todo ha salido correctamente.",
  textoBoton = "Continuar",
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
            className="relative p-6 w-full max-w-md  bg-gray-800 rounded-lg shadow text-center "
          >
            <button
              onClick={onClose}
              className="cursor-pointer absolute top-3 right-3 text-gray-400  hover:text-white"
            >
              <X className="cursor-pointer w-5 h-5" />
            </button>

            <div className="cursor-pointer w-12 h-12 rounded-full  bg-green-900 p-2 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8  text-green-400" />
            </div>

            <p className="mb-2 text-lg font-semibold  text-white">{titulo}</p>
            <p className="mb-4 text-sm  text-gray-300">{mensaje}</p>

            <button
              onClick={onClose}
              className="cursor-pointer px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-4  focus:ring-green-800"
            >
              {textoBoton}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
