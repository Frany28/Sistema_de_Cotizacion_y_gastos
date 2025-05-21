import { useState } from "react";
import api from "../../api/index";
import { UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

const regexNombre = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const regexTelefono = /^[0-9]{10}$/;

export default function ModalAñadirCliente({ onCancel, onSubmit, onSuccess }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    sucursal_id: "",
    tipo_ci: "V",
    numero_ci: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [sucursales, setSucursales] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    if (serverError) setServerError("");
  };

  useEffect(() => {
    const cargarSucursales = async () => {
      try {
        // 1) Usa fetch en lugar de axios para poder llamar a .json()
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/sucursales/dropdown/list`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        // 2) parsea JSON exactamente como en ClientesPage
        const lista = await res.json();
        setSucursales(lista);
      } catch (error) {
        console.error("Error al cargar sucursales:", error);
      }
    };

    cargarSucursales();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (!regexNombre.test(form.nombre)) {
      newErrors.nombre = "Solo letras y espacios permitidos";
    }

    if (!form.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!regexEmail.test(form.email)) {
      newErrors.email = "Email inválido";
    }

    if (!form.telefono.trim()) {
      newErrors.telefono = "El teléfono es requerido";
    } else if (!regexTelefono.test(form.telefono)) {
      newErrors.telefono = "Debe tener 10 dígitos";
    }

    if (!form.direccion.trim()) {
      newErrors.direccion = "La dirección es requerida";
    }

    if (!form.sucursal_id) {
      newErrors.sucursal_id = "Seleccione una sucursal";
    }

    if (!form.numero_ci.trim()) {
      newErrors.numero_ci = "La cédula es requerida";
    } else if (!/^\d{5,10}$/.test(form.numero_ci)) {
      newErrors.numero_ci = "Debe tener 5-10 dígitos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkExistingClient = async () => {
    try {
      if (!form.nombre.trim() && !form.email.trim()) return { exists: false };
      const response = await api.get("/clientes/check", {
        params: {
          nombre: form.nombre.trim(),
          email: form.email.trim(),
        },
        validateStatus: (status) => status < 500,
      });
      if (!response.data || typeof response.data.exists === "undefined")
        return { exists: false };
      return response.data;
    } catch (error) {
      console.error("Error en checkExistingClient:", error);
      return { exists: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    // Crear objeto con el formato que espera el backend
    const clienteData = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      sucursal_id: form.sucursal_id,
      identificacion: `${form.tipo_ci}${form.numero_ci}`, // Combina V/E con números
    };

    setIsSubmitting(true);

    try {
      // 1. Verificar si el cliente ya existe
      const { exists } = await checkExistingClient();
      if (exists) {
        setServerError("El cliente ya está registrado");
        setIsSubmitting(false);
        return;
      }

      // 2. Enviar datos al backend
      const response = await api.post("/clientes", clienteData);

      // 3. Si es exitoso
      if (response.status === 201) {
        onSubmit(response.data);
        onSuccess({
          titulo: "Cliente añadido",
          mensaje: "Cliente registrado exitosamente",
          textoBoton: "Entendido",
        });

        // Resetear formulario
        setForm({
          nombre: "",
          email: "",
          telefono: "",
          direccion: "",
          sucursal_id: "",
          tipo_ci: "V",
          numero_ci: "",
        });

        onCancel();
      }
    } catch (error) {
      console.error("Error al crear cliente:", error);

      if (error.response) {
        if (error.response.status === 400) {
          setServerError(error.response.data.message || "Datos inválidos");
        } else if (error.response.status === 409) {
          setServerError("Cliente ya existe");
        } else {
          setServerError("Error en el servidor");
        }
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
              <UserPlus className="w-8 h-8 text-blue-500 mb-1" />
              <h3 className="text-lg font-semibold  text-white text-center">
                Añadir Cliente
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="absolute right-4 top-4 text-gray-400 bg-transparent rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center hover:bg-gray-600 hover:text-white"
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
                  <label className="block mb-2 text-sm font-medium text-white">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                    placeholder="Juan Pérez"
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
                    className=" text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                    placeholder="correo@dominio.com"
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
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
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
                    className=" border  text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                    placeholder="Av. Siempre Viva 742"
                    required
                  />
                  {errors.direccion && (
                    <p className="text-red-500 text-sm">{errors.direccion}</p>
                  )}
                </div>
                <div className="col-span-2 flex gap-2">
                  <div className="w-1/3">
                    <label className="block mb-2 text-sm font-medium  text-white">
                      Tipo
                    </label>
                    <select
                      name="tipo_ci"
                      value={form.tipo_ci}
                      onChange={handleChange}
                      className=" border   text-sm rounded-lg block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                    >
                      <option value="V">V</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block mb-2 text-sm font-medium  text-white">
                      Cédula / Pasaporte
                    </label>
                    <input
                      type="text"
                      name="numero_ci"
                      value={form.numero_ci}
                      onChange={handleChange}
                      placeholder="Ej: 12345678"
                      className=" border text-sm rounded-lg block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                      required
                    />
                    {errors.numero_ci && (
                      <p className="text-red-500 text-sm">{errors.numero_ci}</p>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Ingrese sucursal del cliente
                  </label>
                  <select
                    name="sucursal_id"
                    value={form.sucursal_id}
                    onChange={handleChange}
                    className=" text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                    required
                  >
                    <option value="">Seleccione una sucursal</option>
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
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "  focus:ring-4 focus:outline-none bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
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
                {isSubmitting ? "Guardando..." : "Guardar Cliente"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
