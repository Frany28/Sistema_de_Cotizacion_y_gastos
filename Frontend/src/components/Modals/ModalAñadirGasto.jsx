// ModalAñadirGasto.jsx (actualizado con campo concepto manual y selección de sucursal)
import { useState, useEffect } from "react";
import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import { FilePlus } from "lucide-react";

export default function ModalAñadirGasto({ onCancel, onSubmit }) {
  const [form, setForm] = useState({
    tipo_gasto_id: "",
    proveedor_id: "",
    concepto: "",
    monto: "",
    descripcion: "",
    fecha: "",
    estado: "pendiente",
    sucursal_id: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const response = await api.post("/gastos/proveedores");
        setProveedores(resp.data);
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    };
    cargarProveedores();

    setSucursales([
      { id: 4, nombre: "Sucursal Central" },
      { id: 5, nombre: "Sucursal Norte" },
      { id: 6, nombre: "Sucursal Sur" },
    ]);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
    if (serverError) setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.tipo_gasto_id)
      newErrors.tipo_gasto_id = "El tipo de gasto es requerido";
    if (!form.proveedor_id)
      newErrors.proveedor_id = "El proveedor es requerido";
    if (!form.concepto || form.concepto.trim().length < 3)
      newErrors.concepto = "El concepto es requerido";
    if (!form.monto || isNaN(form.monto) || parseFloat(form.monto) <= 0)
      newErrors.monto = "El monto debe ser un número positivo";
    if (!form.fecha) newErrors.fecha = "La fecha es requerida";
    if (!form.sucursal_id) newErrors.sucursal_id = "La sucursal es requerida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validateForm()) {
     
      return;
    }
    setIsSubmitting(true);

    try {
      const datosParaEnviar = {
        ...form,
        subtotal: parseFloat(form.monto),
      };
      delete datosParaEnviar.monto;

      const response = await api.post("/gastos", datosParaEnviar);

      if (response.status === 201) {
        onSubmit(response.data);
        setForm({
          tipo_gasto_id: "",
          proveedor_id: "",
          concepto: "",
          monto: "",
          descripcion: "",
          fecha: "",
          estado: "pendiente",
          sucursal_id: "",
        });
        onCancel();
      }
    } catch (error) {
      console.error(" Error al enviar gasto:", error);
      setServerError(
        error.response?.data?.error ||
          "Error al agregar el gasto. Por favor intente nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
      >
        <div className="relative p-4 w-full max-w-3xl max-h-full">
          <div className="relative  rounded-lg shadow-sm bg-gray-800">
            <div className="flex flex-col items-center justify-center pt-6">
              <FilePlus className="w-8 h-8 text-blue-500 mb-1" />
              <h3 className="text-lg font-semibold  text-white text-center">
                Añadir Gasto
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="absolute right-4 top-4 text-gray-400   rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center hover:bg-gray-600 hover:text-white"
              >
                <svg
                  className="w-3 h-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span className="sr-only">Cerrar</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-5">
              <div className="grid gap-4 mb-4 grid-cols-1 md:grid-cols-2">
                {serverError && (
                  <div className="col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {serverError}
                  </div>
                )}

                {/* Tipo de Gasto */}
                <div>
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Tipo de Gasto*
                  </label>
                  <select
                    name="tipo_gasto_id"
                    value={form.tipo_gasto_id}
                    onChange={handleChange}
                    className="  text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="">Seleccione tipo</option>
                    <option value="1">Fijo</option>
                    <option value="2">Eventual</option>
                  </select>
                  {errors.tipo_gasto_id && (
                    <p className="text-red-500 text-sm">
                      {errors.tipo_gasto_id}
                    </p>
                  )}
                </div>

                {/* Proveedor */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Proveedor*
                  </label>
                  <select
                    name="proveedor_id"
                    value={form.proveedor_id}
                    onChange={handleChange}
                    className=" border  text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="">Seleccione proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.proveedor_id && (
                    <p className="text-red-500 text-sm">
                      {errors.proveedor_id}
                    </p>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Sucursal*
                  </label>
                  <select
                    name="sucursal_id"
                    value={form.sucursal_id}
                    onChange={handleChange}
                    className="text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="">Seleccione sucursal</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.sucursal_id && (
                    <p className="text-red-500 text-sm">{errors.sucursal_id}</p>
                  )}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Concepto*
                  </label>
                  <input
                    type="text"
                    name="concepto"
                    value={form.concepto}
                    onChange={handleChange}
                    placeholder="Ej: Compra de carpetas"
                    className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                  />
                  {errors.concepto && (
                    <p className="text-red-500 text-sm">{errors.concepto}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Monto*
                  </label>
                  <input
                    type="number"
                    name="monto"
                    value={form.monto}
                    onChange={handleChange}
                    className=" text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                  {errors.monto && (
                    <p className="text-red-500 text-sm">{errors.monto}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Fecha*
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={form.fecha}
                    onChange={handleChange}
                    className="text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  {errors.fecha && (
                    <p className="text-red-500 text-sm">{errors.fecha}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className=" text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="pagado">Pagado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Sucursal*
                  </label>
                  <select
                    name="sucursal_id"
                    value={form.sucursal_id}
                    onChange={handleChange}
                    className="text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                  >
                    <option value="">Seleccione sucursal</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.sucursal_id && (
                    <p className="text-red-500 text-sm">{errors.sucursal_id}</p>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="3"
                    className=" text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                    placeholder="Descripción del gasto..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-2 w-full justify-center ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : " focus:ring-4 focus:outline-none  bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                }`}
              >
                <svg
                  className="me-2 w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                {isSubmitting ? "Guardando..." : "Guardar Gasto"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
