import { useState } from "react";
import api from "../../api/index";
import { Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

const regexNombre = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const regexTelefono = /^[0-9]{10}$/;
const regexRif = /^J-\d{9}$/;

export default function ModalAñadirProveedor({
  onCancel,
  onSubmit,
  onSuccess,
}) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    rif: "",
    estado: "activo",
  });
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    if (serverError) setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    else if (!regexNombre.test(form.nombre))
      newErrors.nombre = "Solo letras y espacios permitidos";

    if (!form.email.trim()) newErrors.email = "El email es requerido";
    else if (!regexEmail.test(form.email)) newErrors.email = "Email inválido";

    if (!form.telefono.trim()) newErrors.telefono = "El teléfono es requerido";
    else if (!regexTelefono.test(form.telefono))
      newErrors.telefono = "Debe tener 10 dígitos";

    if (!form.direccion.trim())
      newErrors.direccion = "La dirección es requerida";

    if (!form.rif.trim()) newErrors.rif = "El RIF es requerido";
    else if (!regexRif.test(form.rif))
      newErrors.rif = "Formato inválido. Ej: J-123456789";

    if (!form.estado) newErrors.estado = "El estado es requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkExistingProveedor = async () => {
    try {
      const response = await api.get("/proveedores/check", {
        params: {
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim(),
        },
        validateStatus: (status) => status < 500,
      });
      return response.data?.exists;
    } catch (error) {
      console.error("Error al verificar proveedor:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const exists = await checkExistingProveedor();
      if (exists) {
        setServerError(
          "Ya existe un proveedor con este nombre, email o teléfono"
        );
        setIsSubmitting(false);
        return;
      }

      const proveedorData = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
        rif: form.rif.trim().toUpperCase(),
        estado: form.estado,
      };
      const response = await api.post("/proveedores", proveedorData);

      if (response.status === 201) {
        queryClient.invalidateQueries(["proveedores"]);
        onSubmit(response.data);
        onSuccess({
          titulo: "Proveedor añadido",
          mensaje: "Proveedor registrado exitosamente",
          textoBoton: "Entendido",
        });
        setForm({
          nombre: "",
          email: "",
          telefono: "",
          direccion: "",
          rif: "",
          estado: "activo",
        });
        onCancel();
      }
    } catch (error) {
      console.error("Error al crear proveedor:", error);
      if (error.response) {
        setServerError(error.response.data?.message || "Error en el servidor");
      } else {
        setServerError("Error de conexión");
      }
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
        <div className="relative p-4 w-full max-w-md max-h-full">
          <div className="relative  rounded-lg shadow-sm bg-gray-800">
            <div className="flex flex-col items-center justify-center pt-6">
              <Building2 className="w-8 h-8 text-blue-500 mb-1" />
              <h3 className="text-lg font-semibold  text-white text-center">
                Añadir Proveedor
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer absolute right-4 top-4 text-gray-400 bg-transparent  hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center hover:bg-gray-700 "
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
              <div className="grid gap-4 mb-4 grid-cols-2">
                {serverError && (
                  <div className="col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {serverError}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className=" text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="Proveedor S.A."
                    required
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-sm">{errors.nombre}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className=" text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="proveedor@dominio.com"
                    required
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    className="  text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="0412123456"
                    required
                  />
                  {errors.telefono && (
                    <p className="text-red-500 text-sm">{errors.telefono}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    className=" text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="Av. Siempre Viva 742"
                    required
                  />
                  {errors.direccion && (
                    <p className="text-red-500 text-sm">{errors.direccion}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    RIF
                  </label>
                  <input
                    type="text"
                    name="rif"
                    value={form.rif}
                    onChange={handleChange}
                    className=" text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="J-123456789"
                    required
                  />
                  {errors.rif && (
                    <p className="text-red-500 text-sm">{errors.rif}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="cursor-pointer text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  {errors.estado && (
                    <p className="text-red-500 text-sm">{errors.estado}</p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`cursor-pointer text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "focus:ring-4 focus:outline-none  bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                }`}
              >
                <svg
                  className="me-1 -ms-1 w-5 h-5"
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
                {isSubmitting ? "Guardando..." : "Guardar Proveedor"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
