// src/components/Modals/ModalAñadirBanco.jsx
import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ\s]+$/;
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const regexCuenta = /^[0-9]+$/;

export default function ModalAñadirBanco({ onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: "",
    moneda: "VES",
    tipo_identificador: "nro_cuenta",
    identificador: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
    if (serverError) setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (!regexNombre.test(form.nombre)) {
      newErrors.nombre = "Sólo letras y espacios permitidos";
    }

    if (!form.identificador.trim()) {
      newErrors.identificador = "El identificador es requerido";
    } else {
      if (form.tipo_identificador === "email") {
        if (!regexEmail.test(form.identificador.trim())) {
          newErrors.identificador = "Debe ser un email válido";
        }
      } else {
        if (!regexCuenta.test(form.identificador.trim())) {
          newErrors.identificador = "Sólo dígitos numéricos permitidos";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Llamamos al callback que envía el POST al backend
      await onSubmit({
        nombre: form.nombre.trim(),
        moneda: form.moneda,
        tipo_identificador: form.tipo_identificador,
        identificador: form.identificador.trim(),
      });
    } catch (error) {
      console.error("Error en ModalAñadirBanco:", error);
      setServerError(error?.message || "Ocurrió un error al crear el banco");
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
          <div className="relative rounded-lg shadow-sm bg-gray-800">
            <div className="flex flex-col items-center justify-center pt-6">
              <CreditCard className="w-8 h-8 text-blue-500 mb-1" />
              <h3 className="text-lg font-semibold text-white text-center">
                Añadir Banco
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer absolute right-4 top-4 text-gray-400 bg-transparent rounded-lg text-sm w-8 h-8 flex justify-center items-center hover:bg-gray-600 hover:text-white"
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
                  <div className="col-span-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {serverError}
                  </div>
                )}

                {/* Nombre */}
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
                    placeholder="Nombre del banco"
                    required
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-sm">{errors.nombre}</p>
                  )}
                </div>

                {/* Moneda */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Moneda
                  </label>
                  <select
                    name="moneda"
                    value={form.moneda}
                    onChange={handleChange}
                    className="border text-sm rounded-lg block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                  >
                    <option value="VES">VES</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                {/* Tipo Identificador */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Tipo Identificador
                  </label>
                  <select
                    name="tipo_identificador"
                    value={form.tipo_identificador}
                    onChange={handleChange}
                    className="border text-sm rounded-lg block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                  >
                    <option value="nro_cuenta">Número de cuenta</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {/* Identificador */}
                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Identificador
                  </label>
                  <input
                    type="text"
                    name="identificador"
                    value={form.identificador}
                    onChange={handleChange}
                    className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-600 border-gray-500 text-white"
                    placeholder={
                      form.tipo_identificador === "email"
                        ? "correo@dominio.com"
                        : "1234567890"
                    }
                    required
                  />
                  {errors.identificador && (
                    <p className="text-red-500 text-sm">
                      {errors.identificador}
                    </p>
                  )}
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`cursor-pointer text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800"
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
                  />
                </svg>
                {isSubmitting ? "Guardando..." : "Guardar Banco"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
