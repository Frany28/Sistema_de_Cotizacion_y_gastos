import React, { useState, useEffect } from "react";
import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";
import ModalExito from "./ModalExito";
import Loader from "../general/Loader";

// Mantener naming en español y camelCase para coherencia con el proyecto
const regexEmail = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function ModalCrearUsuario({ visible, onCancel, onSuccess }) {
  // Permisos
  const [permisoConcedido, setPermisoConcedido] = useState(null);

  // Catálogos
  const [roles, setRoles] = useState([]);

  // Formulario
  const [formulario, setFormulario] = useState({
    nombre: "",
    email: "",
    password: "",
    rol_id: "",
    estado: "activo",
  });
  const [archivoFirma, setArchivoFirma] = useState(null);

  // Validación y envío
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  // UX
  const [mostrarExito, setMostrarExito] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");

  // Carga inicial al abrir
  useEffect(() => {
    if (!visible) return;
    setPermisoConcedido(null);
    setErrorServidor("");
    setErrores({});

    // 1) Permisos
    api
      .get("usuarios/permisos/crear_usuario", { withCredentials: true })
      .then(({ data }) => setPermisoConcedido(Boolean(data.tienePermiso)))
      .catch(() => setPermisoConcedido(false));

    // 2) Roles
    api
      .get("roles", { withCredentials: true })
      .then(({ data }) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => setRoles([]));
  }, [visible]);

  // Handlers
  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormulario((f) => ({ ...f, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: "" }));
    if (errorServidor) setErrorServidor("");
  };

  const manejarArchivo = (e) => {
    setArchivoFirma(e.target.files[0] || null);
    if (errores.firma) setErrores((prev) => ({ ...prev, firma: "" }));
    if (errorServidor) setErrorServidor("");
  };

  // Validación cliente
  const validar = () => {
    const nuevosErrores = {};

    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre = "Nombre es requerido";
    }

    if (!formulario.email.trim()) {
      nuevosErrores.email = "Email es requerido";
    } else if (!regexEmail.test(formulario.email)) {
      nuevosErrores.email = "Email inválido";
    }

    if (!formulario.password) {
      nuevosErrores.password = "Contraseña es requerida";
    } else if (formulario.password.length < 6) {
      nuevosErrores.password = "Mínimo 6 caracteres";
    }

    if (!formulario.rol_id) {
      nuevosErrores.rol_id = "Seleccione un rol";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarSubmit = (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validar()) return;

    setEnviando(true);
    const formData = new FormData();
    Object.entries(formulario).forEach(([k, v]) => formData.append(k, v));
    if (archivoFirma) formData.append("firma", archivoFirma);

    enviarSolicitud(formData);
  };

  // Parser de errores del backend (incluye duplicados)
  const construirMensajeError = (err) => {
    // Prioridad: lista de errores -> message -> códigos/duplicados -> conexión
    const data = err?.response?.data;
    const respuestaTexto =
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

    // Duplicados MySQL (ER_DUP_ENTRY) o mensajes que contengan 'duplicado'
    const esDuplicado =
      data?.code === "ER_DUP_ENTRY" ||
      /duplicad/i.test(respuestaTexto) ||
      /Duplicate entry/i.test(respuestaTexto);

    if (esDuplicado) {
      // Intento de detectar el campo por el texto del error
      const campo =
        respuestaTexto.match(/for key '(.+?)'/i)?.[1] ||
        respuestaTexto.match(/'(.+?)' duplicad/i)?.[1] ||
        "";

      if (/email/i.test(campo) || /correo/i.test(campo)) {
        return "El correo ya existe. Por favor, usa otro.";
      }
      if (/nombre/i.test(campo)) {
        return "El nombre ya existe. Por favor, usa otro.";
      }
      return "Registro duplicado: ya existe un usuario con esos datos.";
    }

    if (respuestaTexto) return respuestaTexto;

    if (!err?.response) return "Error de conexión con el servidor.";

    return "Ocurrió un error al crear el usuario.";
  };

  const enviarSolicitud = async (formData) => {
    try {
      await api.post("usuarios", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMostrarExito(true);
    } catch (err) {
      setErrorServidor(construirMensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const cerrarExito = () => {
    setMostrarExito(false);
    onCancel?.();
    onSuccess?.();
  };

  // Loader mientras se resuelve el permiso
  if (visible && permisoConcedido === null) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-black/40">
        <Loader />
      </div>
    );
  }

  const deshabilitado = permisoConcedido === false || enviando;

  return (
    <>
      <ModalExito
        visible={mostrarExito}
        onClose={cerrarExito}
        titulo="Usuario creado"
        mensaje="El usuario se ha creado exitosamente."
        textoBoton="Continuar"
      />

      <AnimatePresence>
        {visible && !mostrarExito && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
          >
            <div className="relative p-4 w-full max-w-md max-h-full">
              <div className="relative rounded-lg shadow bg-gray-800">
                <div className="flex flex-col items-center pt-6">
                  <UserPlus className="w-8 h-8 text-blue-500 mb-1" />
                  <h3 className="text-lg font-semibold text-white">
                    Crear Usuario
                  </h3>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="cursor-pointer absolute right-4 top-4 text-gray-400 rounded-lg w-8 h-8 flex justify-center items-center hover:bg-gray-700"
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
                  </button>
                </div>

                <form onSubmit={manejarSubmit} className="p-4 grid gap-4">
                  {/* Avisos inline (permiso/servidor) */}
                  {(permisoConcedido === false || errorServidor) && (
                    <div className="col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
                      {permisoConcedido === false
                        ? "Permiso denegado: no tienes permiso para crear usuarios."
                        : errorServidor}
                    </div>
                  )}

                  {/* Nombre */}
                  <div>
                    <label className="block mb-1 text-sm font-medium text-white">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      placeholder="Nombre del usuario"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      disabled={deshabilitado}
                      className="block w-full p-2.5 border rounded-lg bg-gray-700 border-gray-500 text-white disabled:opacity-60"
                    />
                    {errores.nombre && (
                      <p className="text-red-500 text-sm">{errores.nombre}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block mb-1 text-sm font-medium text-white">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="correo@email.com"
                      value={formulario.email}
                      onChange={manejarCambio}
                      disabled={deshabilitado}
                      className="block w-full p-2.5 border rounded-lg bg-gray-700 border-gray-500 text-white disabled:opacity-60"
                    />
                    {errores.email && (
                      <p className="text-red-500 text-sm">{errores.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block mb-1 text-sm font-medium text-white">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formulario.password}
                      onChange={manejarCambio}
                      placeholder="Mínimo 6 caracteres"
                      disabled={deshabilitado}
                      className="block w-full p-2.5 border rounded-lg bg-gray-700 border-gray-500 text-white disabled:opacity-60"
                    />
                    {errores.password && (
                      <p className="text-red-500 text-sm">{errores.password}</p>
                    )}
                  </div>

                  {/* Rol */}
                  <div>
                    <label className="block mb-1 text-sm font-medium text-white">
                      Rol
                    </label>
                    <select
                      name="rol_id"
                      value={formulario.rol_id}
                      onChange={manejarCambio}
                      disabled={deshabilitado}
                      className="cursor-pointer block w-full p-2.5 border rounded-lg bg-gray-700 border-gray-500 text-white disabled:opacity-60"
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                    {errores.rol_id && (
                      <p className="text-red-500 text-sm">{errores.rol_id}</p>
                    )}
                  </div>

                  {/* Firma (opcional) */}
                  <div className="col-span-2">
                    <label className="block mb-1 text-sm font-medium text-white">
                      Firma (imagen)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      name="firma"
                      onChange={manejarArchivo}
                      disabled={deshabilitado}
                      className="block w-full p-2.5 text-gray-200 rounded file:px-4 file:py-2 file:bg-gray-700 file:text-gray-200 file:border file:border-gray-500 file:rounded file:cursor-pointer file:hover:bg-gray-500 transition duration-200 ease-in-out disabled:opacity-60"
                    />
                    {errores.firma && (
                      <p className="text-red-500 text-sm mt-1">
                        {errores.firma}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={deshabilitado}
                    className={`cursor-pointer col-span-2 w-full text-white font-medium rounded-lg p-2.5 text-center ${
                      enviando
                        ? "bg-gray-400 cursor-not-allowed"
                        : "focus:ring-4 bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                    }`}
                  >
                    {enviando ? "Creando..." : "Crear Usuario"}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
