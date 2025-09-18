// src/components/Modals/ModalAñadirProveedor.jsx
import { useState } from "react";
import api from "../../api/index";
import { Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Expresiones y helpers (camelCase en español)
const regexNombre = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Mantengo teléfono en 10 dígitos, como tenías en tu versión
const regexTelefono = /^[0-9]{10}$/;

const limpiarNoDigitos = (texto) => (texto || "").replace(/\D/g, "");

// Normaliza y formatea RIF a: LETRA-MÁS 9 dígitos (ej: J-123456789)
const normalizarRif = (valor) => {
  const v = (valor || "").toUpperCase().replace(/\s+/g, "");
  // Extraer letra inicial válida (J, G, V, E, P, etc.) y 9 dígitos
  const letra = v.replace(/[^A-Z]/g, "").slice(0, 1) || "J";
  const digitos = v.replace(/\D/g, "").slice(0, 9);
  return `${letra}-${digitos}`;
};

const formatearRifInput = (valor) => {
  // Mientras escribe, mantener "LETRA-" y hasta 9 dígitos
  const upper = (valor || "").toUpperCase();
  const letra = upper.replace(/[^A-Z]/g, "").slice(0, 1);
  const dig = upper.replace(/\D/g, "").slice(0, 9);
  return (letra ? letra : "J") + "-" + dig;
};

// Traductor de errores del backend a mensajes amigables
const construirMensajeError = (err) => {
  const data = err?.response?.data;
  const plano =
    data?.message ||
    data?.error ||
    (typeof data === "string" ? data : "") ||
    "";

  // Listado de validaciones (si tu backend las envía)
  if (Array.isArray(data?.errores) && data.errores.length > 0) {
    return [
      data.message || "Error de validación.",
      ...data.errores.map((e) => `- ${e}`),
    ].join("\n");
  }

  // Duplicados típicos (MySQL u otros)
  const esDuplicado =
    data?.code === "ER_DUP_ENTRY" ||
    /duplicad/i.test(plano) ||
    /Duplicate entry/i.test(plano);

  if (esDuplicado) {
    // Mensaje neutro (sin tecnicismos ni “for key …”)
    return "Ya existe un proveedor con esos datos (nombre, correo, teléfono o RIF).";
  }

  if (plano) return plano;
  if (!err?.response) return "Error de conexión con el servidor.";
  return "Ocurrió un error al crear el proveedor.";
};

export default function ModalAñadirProveedor({
  onCancel,
  onSubmit,
  onSuccess,
}) {
  const [formulario, setFormulario] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    rif: "",
    estado: "activo",
  });

  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    // Máscaras y normalizaciones
    if (name === "rif") {
      const rifFormateado = formatearRifInput(value);
      setFormulario((f) => ({ ...f, rif: rifFormateado }));
    } else if (name === "telefono") {
      // Sólo dígitos, sin formateo visual para mantener 10 dígitos
      const soloDigitos = limpiarNoDigitos(value).slice(0, 10);
      setFormulario((f) => ({ ...f, telefono: soloDigitos }));
    } else {
      setFormulario((f) => ({ ...f, [name]: value }));
    }

    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: "" }));
    if (errorServidor) setErrorServidor("");
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formulario.nombre.trim())
      nuevosErrores.nombre = "El nombre es requerido";
    else if (!regexNombre.test(formulario.nombre))
      nuevosErrores.nombre = "Sólo letras y espacios permitidos";

    if (!formulario.email.trim()) nuevosErrores.email = "El email es requerido";
    else if (!regexEmail.test(formulario.email))
      nuevosErrores.email = "Email inválido";

    if (!formulario.telefono.trim())
      nuevosErrores.telefono = "El teléfono es requerido";
    else if (!regexTelefono.test(formulario.telefono))
      nuevosErrores.telefono = "Debe tener 10 dígitos";

    if (!formulario.direccion.trim())
      nuevosErrores.direccion = "La dirección es requerida";

    // Validación del RIF ya con máscara aplicada
    const rifNormalizado = normalizarRif(formulario.rif);
    if (!rifNormalizado || !/^[A-Z]-\d{9}$/.test(rifNormalizado)) {
      nuevosErrores.rif = "RIF inválido. Ej: J-123456789";
    }

    if (!formulario.estado) nuevosErrores.estado = "El estado es requerido";

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Pre-check de duplicados (reutilizo tu idea y añado rif)
  const verificarProveedorExistente = async () => {
    try {
      const resp = await api.get("/proveedores/check", {
        params: {
          nombre: formulario.nombre.trim(),
          email: formulario.email.trim(),
          telefono: formulario.telefono.trim(),
          rif: normalizarRif(formulario.rif),
        },
        validateStatus: (status) => status < 500,
      });
      return resp.data?.exists;
    } catch (error) {
      console.error("Error al verificar proveedor:", error);
      // En caso de duda, dejar continuar; el backend igual validará
      return false;
    }
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validarFormulario()) return;

    setEnviando(true);
    try {
      const existe = await verificarProveedorExistente();
      if (existe) {
        setErrorServidor(
          "Ya existe un proveedor con esos datos (nombre, correo, teléfono o RIF)."
        );
        setEnviando(false);
        return;
      }

      const payload = {
        nombre: formulario.nombre.trim(),
        email: formulario.email.trim(),
        telefono: formulario.telefono.trim(), // sólo dígitos
        direccion: formulario.direccion.trim(),
        rif: normalizarRif(formulario.rif), // LETRA-#########
        estado: formulario.estado,
      };

      const response = await api.post("/proveedores", payload, {
        withCredentials: true,
      });

      if (response.status === 201) {
        onSubmit?.(response.data);
        onSuccess?.({
          titulo: "Proveedor añadido",
          mensaje: "Proveedor registrado exitosamente",
          textoBoton: "Entendido",
        });
        // Reset y cerrar
        setFormulario({
          nombre: "",
          email: "",
          telefono: "",
          direccion: "",
          rif: "",
          estado: "activo",
        });
        onCancel?.();
      } else {
        // Cualquier no-201 que no sea error duro
        setErrorServidor(
          "No se pudo registrar el proveedor. Intenta nuevamente."
        );
      }
    } catch (error) {
      console.error("Error al crear proveedor:", error);
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
              <Building2 className="w-8 h-8 text-blue-500 mb-1" />
              <h3 className="text-lg font-semibold text-white text-center">
                Añadir Proveedor
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer absolute right-4 top-4 text-gray-400 bg-transparent hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center hover:bg-gray-700"
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
                  <div className="col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
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
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="Proveedor S.A."
                    required
                  />
                  {errores.nombre && (
                    <p className="text-red-500 text-sm">{errores.nombre}</p>
                  )}
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formulario.email}
                    onChange={manejarCambio}
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="proveedor@dominio.com"
                    required
                  />
                  {errores.email && (
                    <p className="text-red-500 text-sm">{errores.email}</p>
                  )}
                </div>

                {/* Teléfono */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={formulario.telefono}
                    onChange={manejarCambio}
                    inputMode="numeric"
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="0412123456"
                    required
                  />
                  {errores.telefono && (
                    <p className="text-red-500 text-sm">{errores.telefono}</p>
                  )}
                </div>

                {/* Dirección */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={formulario.direccion}
                    onChange={manejarCambio}
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="Av. Siempre Viva 742"
                    required
                  />
                  {errores.direccion && (
                    <p className="text-red-500 text-sm">{errores.direccion}</p>
                  )}
                </div>

                {/* RIF */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    RIF
                  </label>
                  <input
                    type="text"
                    name="rif"
                    value={formulario.rif}
                    onChange={manejarCambio}
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    placeholder="J-123456789"
                    required
                  />
                  {errores.rif && (
                    <p className="text-red-500 text-sm">{errores.rif}</p>
                  )}
                </div>

                {/* Estado */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={formulario.estado}
                    onChange={manejarCambio}
                    className="cursor-pointer text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  {errores.estado && (
                    <p className="text-red-500 text-sm">{errores.estado}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className={`cursor-pointer text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center ${
                  enviando
                    ? "bg-gray-400 cursor-not-allowed"
                    : "focus:ring-4 focus:outline-none bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
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
                {enviando ? "Guardando..." : "Guardar Proveedor"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
