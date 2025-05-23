import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Search, X } from "lucide-react";
import axios from "axios";

export default function ModalEditarGasto({
  visible,
  onClose,
  gasto,
  onSave,
  proveedores = [],
  sucursales = [],
  tiposGasto = [],
}) {
  const [form, setForm] = useState({
    id: "",
    tipo_gasto_id: "",
    proveedor_id: "",
    cotizacion_id: "",
    concepto_pago: "",
    descripcion: "",
    subtotal: "0.00",
    porcentaje_iva: 16,
    fecha: new Date().toISOString().split("T")[0],
    sucursal_id: "",
    moneda: "USD",
    tasa_cambio: "",
  });

  const [camposVisibles, setCamposVisibles] = useState({
    proveedor: false,
    cotizacion: false,
  });

  const [cotizaciones, setCotizaciones] = useState([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [busquedaSucursal, setBusquedaSucursal] = useState("");
  const [busquedaTipoGasto, setBusquedaTipoGasto] = useState("");
  const [busquedaCotizacion, setBusquedaCotizacion] = useState("");
  const [showProveedores, setShowProveedores] = useState(false);
  const [showSucursales, setShowSucursales] = useState(false);
  const [showTiposGasto, setShowTiposGasto] = useState(false);
  const [showCotizaciones, setShowCotizaciones] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  const actualizarCamposVisibles = (tipoGastoId) => {
    setCamposVisibles({
      proveedor: tipoGastoId === "1" || tipoGastoId === "5", // Operativo o Proveedor No Rentable
      cotizacion: tipoGastoId === "2", // Servicio Prestado
    });

    // Resetear campos no aplicables
    setForm((prev) => ({
      ...prev,
      proveedor_id: tipoGastoId === "2" ? "" : prev.proveedor_id,
      cotizacion_id: tipoGastoId !== "2" ? "" : prev.cotizacion_id,
    }));
  };

  useEffect(() => {
    if (visible && gasto) {
      // Formatear la fecha correctamente
      const fechaFormateada = gasto.fecha
        ? new Date(gasto.fecha).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      setForm({
        id: gasto.id,
        concepto_pago: gasto.concepto_pago || "",
        descripcion: gasto.descripcion || "",
        subtotal: gasto.subtotal
          ? parseFloat(gasto.subtotal).toFixed(2)
          : "0.00",
        tipo_gasto_id: gasto.tipo_gasto_id?.toString() || "",
        proveedor_id: gasto.proveedor_id?.toString() || "",
        porcentaje_iva: parseFloat(gasto.porcentaje_iva) || 16,
        fecha: fechaFormateada,
        sucursal_id: gasto.sucursal_id?.toString() || "",
        cotizacion_id: gasto.cotizacion_id?.toString() || "",
        moneda: gasto.moneda || "USD",
        tasa_cambio: gasto.tasa_cambio?.toString() || "",
      });

      // Cargar cotizaciones si es necesario
      if (gasto.tipo_gasto_id === 2) {
        cargarCotizaciones();
      }

      // Si las listas están vacías, intentar cargarlas
      if (
        proveedores.length === 0 ||
        sucursales.length === 0 ||
        tiposGasto.length === 0
      ) {
        cargarListasAdicionales();
      }
      actualizarCamposVisibles(gasto.tipo_gasto_id?.toString() || "");
    }
  }, [visible, gasto]);

  const cargarListasAdicionales = async () => {
    setLoadingLists(true);
    try {
      const [prov, suc, tipos] = await Promise.all([
        proveedores.length === 0
          ? axios.get("http://localhost:3000/api/proveedores")
          : Promise.resolve({ data: proveedores }),
        sucursales.length === 0
          ? axios.get("http://localhost:3000/api/sucursales")
          : Promise.resolve({ data: sucursales }),
        tiposGasto.length === 0
          ? axios.get("http://localhost:3000/api/gastos/tipos")
          : Promise.resolve({ data: tiposGasto }),
      ]);

    } catch (error) {
      console.error("Error cargando listas adicionales:", error);
    } finally {
      setLoadingLists(false);
    }
  };

  const cargarCotizaciones = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/cotizaciones"
      );
      setCotizaciones(response.data || []);
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
      setCotizaciones([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "tipo_gasto_id") {
      actualizarCamposVisibles(value);
      if (value === "2") {
        cargarCotizaciones();
      }
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    guardarGasto();
  };

  const guardarGasto = async () => {
    try {
      // Validaciones
      if (camposVisibles.proveedor && !form.proveedor_id) {
        alert("Debe seleccionar un proveedor");
        return;
      }

      if (camposVisibles.cotizacion && !form.cotizacion_id) {
        alert("Debe seleccionar una cotización");
        return;
      }
      if (!form.tipo_gasto_id) {
        alert("Debe seleccionar un tipo de gasto");
        return;
      }
      if (!form.concepto_pago) {
        alert("El concepto de pago es requerido");
        return;
      }
      if (!form.fecha) {
        alert("La fecha es requerida");
        return;
      }
      if (isNaN(parseFloat(form.subtotal)) || parseFloat(form.subtotal) <= 0) {
        alert("El subtotal debe ser un valor numérico mayor a cero");
        return;
      }

      // Calcular impuesto y total
      const subtotalNum = parseFloat(form.subtotal);
      const ivaNum = parseFloat(form.porcentaje_iva);
      const impuesto = parseFloat(((subtotalNum * ivaNum) / 100).toFixed(2));
      const total = parseFloat((subtotalNum + impuesto).toFixed(2));

      // Preparar datos para enviar
      const datosActualizados = {
        ...form,
        impuesto,
        total,
        subtotal: subtotalNum,
        porcentaje_iva: ivaNum,
      };

      onSave(datosActualizados);
    } catch (error) {
      console.error("Error al guardar el gasto:", error);
      alert("Ocurrió un error al guardar los cambios");
    }
  };

  // Obtener nombre del elemento seleccionado para mostrarlo en el input
  const getNombreSeleccionado = (id, lista, campo = "nombre") => {
    if (!id || !lista || !Array.isArray(lista)) {
      // Si no hay lista pero el gasto tiene el nombre, usarlo
      if (!lista && gasto) {
        if (
          campo === "nombre" &&
          id === form.proveedor_id?.toString() &&
          gasto.proveedor_nombre
        ) {
          return gasto.proveedor_nombre;
        }
        if (
          campo === "nombre" &&
          id === form.sucursal_id?.toString() &&
          gasto.sucursal_nombre
        ) {
          return gasto.sucursal_nombre;
        }
        if (
          campo === "nombre" &&
          id === form.tipo_gasto_id?.toString() &&
          gasto.tipo_gasto_nombre
        ) {
          return gasto.tipo_gasto_nombre;
        }
      }
      return "";
    }
    const item = lista.find((item) => item.id.toString() === id.toString());
    return item ? item[campo] : "";
  };

  // Filtrado optimizado para las listas desplegables
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
            className="bg-gray-800 text-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-800 p-6 border-b border-gray-700 z-10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Pencil className="w-6 h-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Editar Gasto</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Campo Tipo de Gasto */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  Tipo de Gasto *
                </label>
                <select
                  name="tipo_gasto_id"
                  value={form.tipo_gasto_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  required
                >
                  <option value="">Seleccione tipo</option>
                  {tiposGasto.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo Proveedor (condicional) */}
              {camposVisibles.proveedor && (
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Proveedor *
                  </label>
                  <select
                    name="proveedor_id"
                    value={form.proveedor_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                    required={camposVisibles.proveedor}
                  >
                    <option value="">Seleccione proveedor</option>
                    {proveedores.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campo Cotización (condicional) */}
              {camposVisibles.cotizacion && (
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Cotización Relacionada *
                  </label>
                  <select
                    name="cotizacion_id"
                    value={form.cotizacion_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                    required={camposVisibles.cotizacion}
                  >
                    <option value="">Seleccione cotización</option>
                    {cotizaciones.map((cot) => (
                      <option key={cot.id} value={cot.id}>
                        {cot.codigo} - {cot.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Concepto de Pago */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Concepto de Pago *
                </label>
                <input
                  type="text"
                  name="concepto_pago"
                  value={form.concepto_pago}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  required
                />
              </div>

              {/* Descripción */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  rows="3"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  required
                />
              </div>

              {/* Moneda */}
              <div>
                <label className="block text-sm font-medium mb-1">Moneda</label>
                <select
                  name="moneda"
                  value={form.moneda}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                >
                  <option value="USD">USD - Dólares</option>
                  <option value="VES">VES - Bolívares</option>
                </select>
              </div>

              {/* Subtotal */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subtotal *
                </label>
                <input
                  type="number"
                  name="subtotal"
                  value={form.subtotal}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                  required
                />
              </div>

              {/* % IVA */}
              <div>
                <label className="block text-sm font-medium mb-1">% IVA</label>
                <select
                  name="porcentaje_iva"
                  value={form.porcentaje_iva}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                >
                  <option value="0">0% - Exento</option>
                  <option value="8">8% - Reducido</option>
                  <option value="16">16% - General</option>
                </select>
              </div>

              {/* Sucursal */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  Sucursal
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={getNombreSeleccionado(form.sucursal_id, sucursales)}
                    readOnly
                    onClick={() => setShowSucursales(!showSucursales)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white cursor-pointer"
                    placeholder="Seleccione sucursal"
                  />
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
                      {sucursales.filter((suc) =>
                        suc.nombre
                          .toLowerCase()
                          .includes(busquedaSucursal.toLowerCase())
                      ).length > 0 ? (
                        sucursales
                          .filter((suc) =>
                            suc.nombre
                              .toLowerCase()
                              .includes(busquedaSucursal.toLowerCase())
                          )
                          .map((suc) => (
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
                          ))
                      ) : (
                        <div className="px-4 py-2 text-gray-400">
                          No hay resultados
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tasa de Cambio (solo visible si moneda es VES) */}
              {form.moneda === "VES" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tasa de Cambio (BS/USD) *
                  </label>
                  <input
                    type="number"
                    name="tasa_cambio"
                    value={form.tasa_cambio}
                    onChange={handleChange}
                    min="0"
                    step="0.0001"
                    className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white"
                    required={form.moneda === "VES"}
                  />
                </div>
              )}

              {/* Cotización (solo visible para tipo de gasto 2 - Servicio Prestado) */}
              {form.tipo_gasto_id === "2" && (
                <div className="col-span-2 relative">
                  <label className="block text-sm font-medium mb-1">
                    Cotización Relacionada
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getNombreSeleccionado(
                        form.cotizacion_id,
                        cotizaciones,
                        "codigo"
                      )}
                      readOnly
                      onClick={() => setShowCotizaciones(!showCotizaciones)}
                      className="w-full px-3 py-2 border rounded-md bg-gray-700 text-white cursor-pointer"
                      placeholder="Seleccione cotización"
                    />
                    {showCotizaciones && (
                      <div className="absolute z-10 mt-1 w-full bg-gray-700 rounded-md shadow-lg border border-gray-600 max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-600 sticky top-0 bg-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={busquedaCotizacion}
                              onChange={(e) =>
                                setBusquedaCotizacion(e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded focus:outline-none"
                              placeholder="Buscar cotización..."
                              autoFocus
                            />
                          </div>
                        </div>
                        {cotizaciones.filter((cot) =>
                          cot.codigo
                            .toLowerCase()
                            .includes(busquedaCotizacion.toLowerCase())
                        ).length > 0 ? (
                          cotizaciones
                            .filter((cot) =>
                              cot.codigo
                                .toLowerCase()
                                .includes(busquedaCotizacion.toLowerCase())
                            )
                            .map((cot) => (
                              <div
                                key={cot.id}
                                className={`px-4 py-2 hover:bg-gray-600 cursor-pointer ${
                                  form.cotizacion_id === cot.id.toString()
                                    ? "bg-blue-600"
                                    : ""
                                }`}
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    cotizacion_id: cot.id.toString(),
                                  }));
                                  setShowCotizaciones(false);
                                  setBusquedaCotizacion("");
                                }}
                              >
                                {cot.codigo} - {cot.descripcion}
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
                </div>
              )}
            </form>

            <div className="sticky bottom-0 bg-gray-800 p-4 border-t border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
