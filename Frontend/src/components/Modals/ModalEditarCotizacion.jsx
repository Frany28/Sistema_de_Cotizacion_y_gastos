import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Search, ChevronDown } from "lucide-react";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";
import Loader from "../general/Loader";

export default function ModalEditarCotizacion({
  titulo = "Editar Cotización",
  visible,
  onClose,
  onSubmit,
  cotizacion,
  sucursales = [],
  serviciosProductos = [],
  clientes = [],
}) {
  const [form, setForm] = useState({
    cliente_id: "",
    sucursal_id: "",
    estado: "pendiente",
    confirmacion_cliente: "0",
    observaciones: "",
    operacion: "",
    mercancia: "",
    bl: "",
    contenedor: "",
    puerto: "",
    detalle: [],
  });

  const [modalExitoVisible, setModalExitoVisible] = useState(false);
  const [modalErrorVisible, setModalErrorVisible] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [busquedaSucursal, setBusquedaSucursal] = useState("");
  const [busquedaServicio, setBusquedaServicio] = useState("");
  const [showClientes, setShowClientes] = useState(false);
  const [showSucursales, setShowSucursales] = useState(false);
  const [showServicios, setShowServicios] = useState(false);

  useEffect(() => {
    if (cotizacion) {
      console.log("📦 Props en ModalEditarCotizacion:", {
        cotizacion,
        clientes,
        sucursales,
        serviciosProductos,
      });
      setForm({
        cliente_id: cotizacion.cliente_id?.toString() || "",
        sucursal_id: cotizacion.sucursal_id?.toString() || "",
        estado: cotizacion.estado || "pendiente",
        confirmacion_cliente: cotizacion.confirmacion_cliente ? "1" : "0",
        observaciones: cotizacion.observaciones || "",
        operacion: cotizacion.operacion || "",
        mercancia: cotizacion.mercancia || "",
        bl: cotizacion.bl || "",
        contenedor: cotizacion.contenedor || "",
        puerto: cotizacion.puerto || "",
        detalle: Array.isArray(cotizacion.detalle) ? cotizacion.detalle : [],
      });
    }
  }, [cotizacion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addLinea = () => {
    setForm((prev) => ({
      ...prev,
      detalle: [
        ...(Array.isArray(prev.detalle) ? prev.detalle : []),
        {
          servicio_productos_id: "",
          cantidad: 1,
          precio_unitario: 0,
          porcentaje_iva: 16,
          subtotal: 0,
          impuesto: 0,
          total: 0,
        },
      ],
    }));
  };

  const removeLinea = (index) => {
    setForm((prev) => ({
      ...prev,
      detalle: prev.detalle.filter((_, i) => i !== index),
    }));
  };

  const handleDetalleChange = (index, field, value) => {
    setForm((prev) => {
      const newDetalle = [...prev.detalle];
      const item = { ...newDetalle[index] };

      item[field] = value;

      // Recalcular valores si cambian cantidad, precio o IVA
      if (
        field === "cantidad" ||
        field === "precio_unitario" ||
        field === "porcentaje_iva"
      ) {
        const cantidad = Number(item.cantidad) || 0;
        const precio = Number(item.precio_unitario) || 0;
        const iva = Number(item.porcentaje_iva) || 0;

        item.subtotal = cantidad * precio;
        item.impuesto = item.subtotal * (iva / 100);
        item.total = item.subtotal + item.impuesto;
      }

      newDetalle[index] = item;
      return { ...prev, detalle: newDetalle };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validaciones básicas
      if (!form.cliente_id) {
        throw new Error("Debe seleccionar un cliente");
      }

      if (form.detalle.length === 0) {
        throw new Error("Debe agregar al menos un ítem al detalle");
      }

      await onSubmit(form);
      setMensajeExito("La cotización se actualizó correctamente.");
      setModalExitoVisible(true);
    } catch (error) {
      console.error("Error al guardar:", error);
      setMensajeError(
        error.message || "Hubo un error al actualizar la cotización."
      );
      setModalErrorVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNombreSeleccionado = (id, lista, campo = "nombre") => {
    if (!id || !lista || !Array.isArray(lista)) return "";
    const item = lista.find((item) => item.id.toString() === id.toString());
    return item ? item[campo] : "";
  };

  const filtrarOpciones = (lista, busqueda, campo = "nombre") => {
    if (!lista || !Array.isArray(lista)) return [];
    return lista.filter((item) =>
      item[campo]?.toString().toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-800 text-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="sticky top-0 bg-gray-800 p-6 border-b border-gray-700 z-10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Pencil className="w-6 h-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">{titulo}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Sección de información básica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Cliente */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Cliente *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getNombreSeleccionado(form.cliente_id, clientes)}
                      readOnly
                      onClick={() => setShowClientes(!showClientes)}
                      className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white cursor-pointer"
                      placeholder="Seleccione cliente"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {showClientes && (
                      <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-md shadow-lg border border-gray-600 max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-600 sticky top-0 bg-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={busquedaCliente}
                              onChange={(e) =>
                                setBusquedaCliente(e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded focus:outline-none"
                              placeholder="Buscar cliente..."
                              autoFocus
                            />
                          </div>
                        </div>
                        {filtrarOpciones(clientes, busquedaCliente).length >
                        0 ? (
                          filtrarOpciones(clientes, busquedaCliente).map(
                            (cli) => (
                              <div
                                key={cli.id}
                                className={`px-4 py-2 hover:bg-gray-600 cursor-pointer ${
                                  form.cliente_id === cli.id.toString()
                                    ? "bg-blue-600"
                                    : ""
                                }`}
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    cliente_id: cli.id.toString(),
                                  }));
                                  setShowClientes(false);
                                  setBusquedaCliente("");
                                }}
                              >
                                {cli.nombre}
                              </div>
                            )
                          )
                        ) : (
                          <div className="px-4 py-2 text-gray-400">
                            No hay resultados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sucursal */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Sucursal
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getNombreSeleccionado(
                        form.sucursal_id,
                        sucursales
                      )}
                      readOnly
                      onClick={() => setShowSucursales(!showSucursales)}
                      className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white cursor-pointer"
                      placeholder="Seleccione sucursal"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {showSucursales && (
                      <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-md shadow-lg border border-gray-600 max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-600 sticky top-0 bg-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={busquedaSucursal}
                              onChange={(e) =>
                                setBusquedaSucursal(e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded focus:outline-none"
                              placeholder="Buscar sucursal..."
                              autoFocus
                            />
                          </div>
                        </div>
                        {filtrarOpciones(sucursales, busquedaSucursal).length >
                        0 ? (
                          filtrarOpciones(sucursales, busquedaSucursal).map(
                            (suc) => (
                              <div
                                key={suc.id}
                                className={`px-4 py-2 hover:bg-gray-600 cursor-pointer ${
                                  form.sucursal_id === suc.id.toString()
                                    ? "bg-blue-600"
                                    : ""
                                }`}
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    sucursal_id: suc.id.toString(),
                                  }));
                                  setShowSucursales(false);
                                  setBusquedaSucursal("");
                                }}
                              >
                                {suc.nombre}
                              </div>
                            )
                          )
                        ) : (
                          <div className="px-4 py-2 text-gray-400">
                            No hay resultados
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobada">Aprobada</option>
                    <option value="rechazada">Rechazada</option>
                  </select>
                </div>

                {/* Confirmación Cliente */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirmación Cliente
                  </label>
                  <select
                    name="confirmacion_cliente"
                    value={form.confirmacion_cliente}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  >
                    <option value="0">No confirmado</option>
                    <option value="1">Confirmado</option>
                  </select>
                </div>

                {/* Operación */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Operación
                  </label>
                  <input
                    type="text"
                    name="operacion"
                    value={form.operacion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  />
                </div>

                {/* Mercancía */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mercancía
                  </label>
                  <input
                    type="text"
                    name="mercancia"
                    value={form.mercancia}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  />
                </div>

                {/* BL */}
                <div>
                  <label className="block text-sm font-medium mb-1">BL</label>
                  <input
                    type="text"
                    name="bl"
                    value={form.bl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  />
                </div>

                {/* Contenedor */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Contenedor
                  </label>
                  <input
                    type="text"
                    name="contenedor"
                    value={form.contenedor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  />
                </div>

                {/* Puerto */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Puerto
                  </label>
                  <input
                    type="text"
                    name="puerto"
                    value={form.puerto}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  rows={3}
                />
              </div>

              {/* Detalle de ítems */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Detalle de Ítems</h3>
                  <button
                    type="button"
                    onClick={addLinea}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
                  >
                    <span>+</span>
                    <span>Agregar Línea</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-400">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2">Servicio/Producto</th>
                        <th className="px-4 py-2">Cantidad</th>
                        <th className="px-4 py-2">Precio Unitario</th>
                        <th className="px-4 py-2">% IVA</th>
                        <th className="px-4 py-2">Subtotal</th>
                        <th className="px-4 py-2">Impuesto</th>
                        <th className="px-4 py-2">Total</th>
                        <th className="px-4 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.detalle.map((item, index) => (
                        <tr key={index} className="border-b border-gray-700">
                          {/* Servicio/Producto */}
                          <td className="px-4 py-2">
                            <div className="relative">
                              <input
                                type="text"
                                value={getNombreSeleccionado(
                                  item.servicio_productos_id,
                                  serviciosProductos
                                )}
                                readOnly
                                onClick={() => setShowServicios(!showServicios)}
                                className="w-full px-3 py-1 border rounded bg-gray-700 text-white cursor-pointer"
                                placeholder="Seleccione servicio"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              {showServicios && (
                                <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-md shadow-lg border border-gray-600 max-h-60 overflow-y-auto">
                                  <div className="p-2 border-b border-gray-600 sticky top-0 bg-gray-700">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                      <input
                                        type="text"
                                        value={busquedaServicio}
                                        onChange={(e) =>
                                          setBusquedaServicio(e.target.value)
                                        }
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded focus:outline-none"
                                        placeholder="Buscar servicio..."
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  {filtrarOpciones(
                                    serviciosProductos,
                                    busquedaServicio
                                  ).length > 0 ? (
                                    filtrarOpciones(
                                      serviciosProductos,
                                      busquedaServicio
                                    ).map((serv) => (
                                      <div
                                        key={serv.id}
                                        className={`px-4 py-2 hover:bg-gray-600 cursor-pointer ${
                                          item.servicio_productos_id ===
                                          serv.id.toString()
                                            ? "bg-blue-600"
                                            : ""
                                        }`}
                                        onClick={() => {
                                          handleDetalleChange(
                                            index,
                                            "servicio_productos_id",
                                            serv.id.toString()
                                          );
                                          setShowServicios(false);
                                          setBusquedaServicio("");
                                        }}
                                      >
                                        {serv.nombre}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-4 py-2 text-gray-400">
                                      No hay resultados
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Cantidad */}
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="w-full px-3 py-1 border rounded bg-gray-700 text-white"
                              value={item.cantidad}
                              onChange={(e) =>
                                handleDetalleChange(
                                  index,
                                  "cantidad",
                                  e.target.value
                                )
                              }
                              min="1"
                            />
                          </td>

                          {/* Precio Unitario */}
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="w-full px-3 py-1 border rounded bg-gray-700 text-white"
                              value={item.precio_unitario}
                              onChange={(e) =>
                                handleDetalleChange(
                                  index,
                                  "precio_unitario",
                                  e.target.value
                                )
                              }
                              min="0"
                              step="0.01"
                            />
                          </td>

                          {/* % IVA */}
                          <td className="px-4 py-2">
                            <select
                              className="w-full px-3 py-1 border rounded bg-gray-700 text-white"
                              value={item.porcentaje_iva}
                              onChange={(e) =>
                                handleDetalleChange(
                                  index,
                                  "porcentaje_iva",
                                  e.target.value
                                )
                              }
                            >
                              <option value="0">0%</option>
                              <option value="8">8%</option>
                              <option value="16">16%</option>
                            </select>
                          </td>

                          {/* Subtotal */}
                          <td className="px-4 py-2 text-right">
                            {Number(item.subtotal).toFixed(2)}
                          </td>

                          {/* Impuesto */}
                          <td className="px-4 py-2 text-right">
                            {Number(item.impuesto).toFixed(2)}
                          </td>

                          {/* Total */}
                          <td className="px-4 py-2 text-right">
                            {Number(item.total).toFixed(2)}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-2">
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
                </div>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-700 p-4 rounded">
                <div className="text-right">
                  <span className="font-medium">Subtotal:</span>{" "}
                  {form.detalle
                    .reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
                    .toFixed(2)}
                </div>
                <div className="text-right">
                  <span className="font-medium">Impuesto:</span>{" "}
                  {form.detalle
                    .reduce((sum, item) => sum + Number(item.impuesto || 0), 0)
                    .toFixed(2)}
                </div>
                <div className="text-right font-bold">
                  <span className="font-medium">Total:</span>{" "}
                  {form.detalle
                    .reduce((sum, item) => sum + Number(item.total || 0), 0)
                    .toFixed(2)}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <Pencil className="w-5 h-5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>

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
