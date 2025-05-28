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
  serviciosProductos = [],
}) {
  const [form, setForm] = useState({
    sucursal_id: "",
    estado: "pendiente",
    confirmacion_cliente: "0",
    observaciones: "",
    detalle: [],
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
        detalle: Array.isArray(cotizacion.detalle) ? cotizacion.detalle : [],
      });
    }
  }, [cotizacion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Añadir una nueva línea vacía al detalle
  const addLinea = () => {
    setForm((prev) => ({
      ...prev,
      detalle: [
        ...prev.detalle,
        {
          servicio_productos_id: "",
          cantidad: 1,
          precio_unitario: 0,
          porcentaje_iva: 16,
        },
      ],
    }));
  };

  // Eliminar línea por índice
  const removeLinea = (index) => {
    setForm((prev) => ({
      ...prev,
      detalle: prev.detalle.filter((_, i) => i !== index),
    }));
  };

  // Actualizar campo en línea específica
  const handleDetalleChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.detalle];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, detalle: updated };
    });
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg"
          >
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-3 right-3 text-gray-400 hover:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Título */}
            <div className="text-center mb-4">
              <Pencil className="mx-auto mb-2 text-blue-600 w-10 h-10" />
              <h3 className="text-xl font-semibold text-white">{titulo}</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sucursal */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Sucursal
                </label>
                <select
                  name="sucursal_id"
                  value={form.sucursal_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Seleccione sucursal...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confirmación Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirmación Cliente
                </label>
                <select
                  name="confirmacion_cliente"
                  value={form.confirmacion_cliente}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="0">No confirmado</option>
                  <option value="1">Confirmado</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  rows={3}
                />
              </div>

              {/* Detalle de ítems */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Detalle de ítems
                </h4>
                <table className="w-full text-sm text-left text-gray-400 mb-2">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-2 py-1">Servicio/Producto</th>
                      <th className="px-2 py-1">Cantidad</th>
                      <th className="px-2 py-1">Precio U.</th>
                      <th className="px-2 py-1">% IVA</th>
                      <th className="px-2 py-1">Subtotal</th>
                      <th className="px-2 py-1">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.detalle.map((item, index) => (
                      <tr key={index} className="border-b border-gray-600">
                        <td className="px-2 py-1">
                          <select
                            className="w-full bg-gray-700 text-white p-1 border border-gray-600 rounded"
                            value={item.servicio_productos_id}
                            onChange={(e) =>
                              handleDetalleChange(
                                index,
                                "servicio_productos_id",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Seleccione...</option>
                            {serviciosProductos.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            className="w-full bg-gray-700 text-white p-1 border border-gray-600 rounded"
                            value={item.cantidad}
                            onChange={(e) =>
                              handleDetalleChange(
                                index,
                                "cantidad",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            className="w-full bg-gray-700 text-white p-1 border border-gray-600 rounded"
                            value={item.precio_unitario}
                            onChange={(e) =>
                              handleDetalleChange(
                                index,
                                "precio_unitario",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            className="w-full bg-gray-700 text-white p-1 border border-gray-600 rounded"
                            value={item.porcentaje_iva}
                            onChange={(e) =>
                              handleDetalleChange(
                                index,
                                "porcentaje_iva",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(
                            Number(item.cantidad) * Number(item.precio_unitario)
                          ).toFixed(2)}
                        </td>
                        <td className="px-2 py-1">
                          <button
                            type="button"
                            onClick={() => removeLinea(index)}
                            className="text-red-500 hover:text-red-300"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={addLinea}
                  className="text-white bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
                >
                  + Agregar línea
                </button>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-center gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 px-4 py-2 rounded"
                >
                  {isSubmitting ? (
                    <Loader size="sm" />
                  ) : (
                    <Pencil className="w-5 h-5" />
                  )}
                  Guardar cambios
                </button>
              </div>
            </form>

            {/* Modales de feedback */}
            <ModalExito
              visible={modalExitoVisible}
              onClose={() => setModalExitoVisible(false)}
              titulo="¡Éxito!"
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
      )}
    </AnimatePresence>
  );
}
