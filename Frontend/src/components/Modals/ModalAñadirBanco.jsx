// src/components/Modals/ModalAñadirBanco.jsx
import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ\s]+$/;
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helpers para máscara de número de cuenta (20 dígitos => 4-4-2-10)
const limpiarNoDigitos = (texto) => (texto || "").replace(/\D/g, "");
const formatearNumeroCuentaEs = (soloDigitos) => {
  const d = (soloDigitos || "").slice(0, 20);
  const partes = [];
  if (d.length > 0) partes.push(d.slice(0, 4));
  if (d.length > 4) partes.push(d.slice(4, 8));
  if (d.length > 8) partes.push(d.slice(8, 10));
  if (d.length > 10) partes.push(d.slice(10, 20));
  return partes.join("-");
};

// Traductor de errores del backend a mensajes amigables
const construirMensajeError = (err) => {
  const data = err?.response?.data;
  const plano =
    data?.message ||
    data?.error ||
    (typeof data === "string" ? data : "") ||
    "";

  if (Array.isArray(data?.errores) && data.errores.length > 0) {
    return [
      data.message || "Error de validación.",
      ...data.errores.map((e) => `- ${e}`),
    ].join("\n");
  }

  const esDuplicado =
    data?.code === "ER_DUP_ENTRY" ||
    /duplicad/i.test(plano) ||
    /Duplicate entry/i.test(plano);

  if (esDuplicado) {
    return "Ya existe un banco con ese nombre o identificador.";
  }

  if (plano) return plano;
  if (!err?.response) return "Error de conexión con el servidor.";
  return "Ocurrió un error al crear el banco.";
};

export default function ModalAñadirBanco({ onCancel, onSubmit }) {
  const [formulario, setFormulario] = useState({
    nombre: "",
    moneda: "VES",
    tipoIdentificador: "nro_cuenta", // camelCase en español
    identificador: "",
  });
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    // Máscara automática para número de cuenta
    if (
      name === "identificador" &&
      formulario.tipoIdentificador === "nro_cuenta"
    ) {
      const soloDigitos = limpiarNoDigitos(value);
      const conGuiones = formatearNumeroCuentaEs(soloDigitos);
      setFormulario((f) => ({ ...f, identificador: conGuiones }));
    } else if (name === "tipoIdentificador") {
      // Al cambiar el tipo, limpiamos el campo para evitar residuos del formato
      setFormulario((f) => ({
        ...f,
        tipoIdentificador: value,
        identificador: "",
      }));
    } else {
      setFormulario((f) => ({ ...f, [name]: value }));
    }

    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: "" }));
    if (errorServidor) setErrorServidor("");
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Nombre
    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es requerido.";
    } else if (!regexNombre.test(formulario.nombre)) {
      nuevosErrores.nombre = "Sólo letras y espacios permitidos.";
    }

    // Identificador
    if (!formulario.identificador.trim()) {
      nuevosErrores.identificador = "El identificador es requerido.";
    } else {
      if (formulario.tipoIdentificador === "email") {
        if (!regexEmail.test(formulario.identificador.trim())) {
          nuevosErrores.identificador = "Debe ser un email válido.";
        }
      } else {
        // nro_cuenta => 20 dígitos (los guiones se agregan solos)
        const soloDigitos = limpiarNoDigitos(formulario.identificador);
        if (soloDigitos.length !== 20) {
          nuevosErrores.identificador =
            "El número de cuenta debe tener 20 dígitos (los guiones se agregan automáticamente).";
        }
      }
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validarFormulario()) return;

    setEnviando(true);
    try {
      // Para nro_cuenta enviamos sólo dígitos (sin guiones) al backend
      const payload = {
        nombre: formulario.nombre.trim(),
        moneda: formulario.moneda,
        tipo_identificador:
          formulario.tipoIdentificador === "nro_cuenta"
            ? "nro_cuenta"
            : "email",
        identificador:
          formulario.tipoIdentificador === "nro_cuenta"
            ? limpiarNoDigitos(formulario.identificador)
            : formulario.identificador.trim(),
      };

      await onSubmit(payload);
    } catch (error) {
      console.error("Error en ModalAñadirBanco:", error);
      setErrorServidor(construirMensajeError(error));
    } finally {
      setEnviando(false);
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
                className="cursor-pointer absolute right-4 top-4 text-gray-400 bg-transparent rounded-lg text-sm w-8 h-8 flex justify-center items-center hover:bg-gray-700 hover:text-white"
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

            <form onSubmit={manejarSubmit} className="p-4 md:p-5">
              <div className="grid gap-4 mb-4 grid-cols-2">
                {errorServidor && (
                  <div className="col-span-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
                    {errorServidor}
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
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="Nombre del banco"
                    required
                  />
                  {errores.nombre && (
                    <p className="text-red-500 text-sm">{errores.nombre}</p>
                  )}
                </div>

                {/* Moneda */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Moneda
                  </label>
                  <select
                    name="moneda"
                    value={formulario.moneda}
                    onChange={manejarCambio}
                    className="cursor-pointer border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                  >
                    <option value="VES">VES</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                {/* Tipo Identificador */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Tipo de identificador
                  </label>
                  <select
                    name="tipoIdentificador"
                    value={formulario.tipoIdentificador}
                    onChange={manejarCambio}
                    className="cursor-pointer border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                  >
                    <option value="nro_cuenta">Número de cuenta</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {/* Identificador */}
                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium text-white">
                    {formulario.tipoIdentificador === "email"
                      ? "Email"
                      : "Número de cuenta"}
                  </label>
                  <input
                    type="text"
                    name="identificador"
                    value={formulario.identificador}
                    onChange={manejarCambio}
                    inputMode={
                      formulario.tipoIdentificador === "email"
                        ? "email"
                        : "numeric"
                    }
                    className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder={
                      formulario.tipoIdentificador === "email"
                        ? "correo@dominio.com"
                        : "0000-0000-00-0000000000"
                    }
                    required
                  />
                  {errores.identificador && (
                    <p className="text-red-500 text-sm">
                      {errores.identificador}
                    </p>
                  )}
                </div>
              </div>

              {/* Botón Guardar */}
              <button
                type="submit"
                disabled={enviando}
                className={`cursor-pointer text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center ${
                  enviando
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
                {enviando ? "Guardando..." : "Guardar Banco"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
