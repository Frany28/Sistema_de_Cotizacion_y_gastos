import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ModalMotivoRechazo({ visible, onClose, onSubmit }) {
  const [motivo, setMotivo] = useState("");

  const handleSubmit = () => {
    if (motivo.trim() === "") {
      alert("Debes indicar el motivo del rechazo.");
      return;
    }
    onSubmit(motivo);
    setMotivo("");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md transition-transform transform"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón de cierre */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-800 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 text-center">
              Motivo del Rechazo
            </h2>

            <textarea
              className="w-full h-32 p-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none border border-gray-300 dark:border-gray-700 shadow-sm"
              placeholder="Indica el motivo del rechazo..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            ></textarea>

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition shadow-md"
              >
                Rechazar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
