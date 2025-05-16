import React, { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";
import Loader from "../general/Loader"; // Ajusta la ruta si es necesario

export default function ModalEditarCotizacion({
  titulo = "Editar Cotización",
  visible,
  onClose,
  onSubmit,
  cotizacion,
  sucursales = [],
}) {
  const [form, setForm] = useState({
    sucursal_id: "",
    estado: "pendiente",
    confirmacion_cliente: "0",
    observaciones: "",
  });

  const [modalExitoVisible, setModalExitoVisible] = useState(false);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const [loading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cotizacion) {
      setForm({
        sucursal_id: cotizacion.sucursal_id ?? "",
        estado: cotizacion.estado ?? "pendiente",
        confirmacion_cliente: cotizacion.confirmacion_cliente ? "1" : "0",
        observaciones: cotizacion.observaciones ?? "",
      });
    }
  }, [cotizacion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      setMensajeExito("La cotización se actualizó correctamente.");
      setModalExitoVisible(true);
    } catch (error) {
      console.error("Error al guardar:", error);
      setMensajeError("Hubo un error al actualizar la cotización.");
      setModalErrorVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

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
          className="relative w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-4">
            <Pencil className="mx-auto mb-2 text-blue-600 w-10 h-10" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {titulo}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sucursal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sucursal
                </label>
                <select
                  name="sucursal_id"
                  value={form.sucursal_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Seleccione una sucursal</option>
                  {Array.isArray(sucursales) &&
                    sucursales.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </option>
                    ))}
                </select>
              </div>

              {/* Confirmación cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmación del Cliente
                </label>
                <select
                  name="confirmacion_cliente"
                  value={form.confirmacion_cliente}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Botón Guardar */}
            <div className="flex justify-center gap-2 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </form>

          {/* Modales de Éxito y Error */}
          <ModalExito
            visible={modalExitoVisible}
            onClose={() => {
              setModalExitoVisible(false);
              onClose();
            }}
            titulo="Cotización actualizada"
            mensaje={mensajeExito}
          />

          <ModalError
            visible={modalErrorVisible}
            onClose={() => setModalErrorVisible(false)}
            titulo="Error al actualizar"
            mensaje={mensajeError}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
