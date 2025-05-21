import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";
import ModalError from "./ModalError";
import ModalExito from "./ModalExito";
import Loader from "../general/Loader";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function ModalCrearUsuario({ visible, onCancel, onSuccess }) {
  const [permitted, setPermitted] = useState(null);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol_id: "",
    estado: "activo",
  });
  const [signatureFile, setSignatureFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  useEffect(() => {
    if (visible) {
      setPermitted(null);
      axios
        .get("http://localhost:3000/api/usuarios/permisos/crear_usuario", {
          withCredentials: true,
        })
        .then(({ data }) => setPermitted(data.tienePermiso))
        .catch(() => setPermitted(false));
      axios
        .get("http://localhost:3000/api/roles", { withCredentials: true })
        .then(({ data }) => setRoles(data))
        .catch(() => setRoles([]));
    }
  }, [visible]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  const handleFileChange = (e) => {
    setSignatureFile(e.target.files[0] || null);
    setErrors((err) => ({ ...err, firma: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nombre.trim()) newErrors.nombre = "Nombre es requerido";
    if (!form.email.trim()) newErrors.email = "Email es requerido";
    else if (!EMAIL_REGEX.test(form.email)) newErrors.email = "Email inválido";
    if (!form.password) newErrors.password = "Contraseña es requerida";
    else if (form.password.length < 6)
      newErrors.password = "Mínimo 6 caracteres";
    if (!form.rol_id) newErrors.rol_id = "Seleccione un rol";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (signatureFile) {
      data.append("firma", signatureFile);
    }
    sendRequest(data);
  };

  const sendRequest = async (data) => {
    try {
      await axios.post("http://localhost:3000/api/usuarios", data, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowExito(true);
    } catch (err) {
      setErrorModalMessage(
        err.response?.data?.message || "Error al crear usuario"
      );
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExitoClose = () => {
    setShowExito(false);
    onCancel();
    onSuccess();
  };

  const handleErrorClose = () => {
    setShowErrorModal(false);
    if (permitted === false) onCancel();
  };

  return (
    <>
      <ModalError
        visible={permitted === false || showErrorModal}
        onClose={handleErrorClose}
        titulo={
          permitted === false ? "Permiso denegado" : "¡Ha ocurrido un error!"
        }
        mensaje={
          permitted === false
            ? "No tienes permiso para crear usuarios."
            : errorModalMessage
        }
        textoBoton="Entendido"
      />
      <ModalExito
        visible={showExito}
        onClose={handleExitoClose}
        titulo="Usuario creado"
        mensaje="El usuario se ha creado exitosamente."
        textoBoton="Continuar"
      />
      {visible && permitted === null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-black/40">
          <Loader />
        </div>
      )}
      <AnimatePresence>
        {visible && !showExito && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
          >
            <div className="relative p-4 w-full max-w-md max-h-full">
              <div className="relative  rounded-lg shadow bg-gray-800">
                <div className="flex flex-col items-center pt-6">
                  <UserPlus className="w-8 h-8 text-blue-500 mb-1" />
                  <h3 className="text-lg font-semibold  text-white">
                    Crear Usuario
                  </h3>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="absolute right-4 top-4 text-gray-400  rounded-lg w-8 h-8 flex justify-center items-center hover:bg-gray-600"
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
                <form onSubmit={handleSubmit} className="p-4 grid gap-4">
                  {/* Nombre */}
                  <div>
                    <label className="block mb-1 text-sm font-medium  text-white">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                    />
                    {errors.nombre && (
                      <p className="text-red-500 text-sm">{errors.nombre}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block mb-1 text-sm font-medium  text-white">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm">{errors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block mb-1 text-sm font-medium  text-white">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                    />
                    {errors.password && (
                      <p className="text-red-500 text-sm">{errors.password}</p>
                    )}
                  </div>

                  {/* Rol */}
                  <div>
                    <label className="block mb-1 text-sm font-medium  text-white">
                      Rol
                    </label>
                    <select
                      name="rol_id"
                      value={form.rol_id}
                      onChange={handleChange}
                      className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                    {errors.rol_id && (
                      <p className="text-red-500 text-sm">{errors.rol_id}</p>
                    )}
                  </div>

                  {/* Firma */}
                  {/* Firma */}
                  <div className="col-span-2">
                    <label className="block mb-1 text-sm font-medium text-white">
                      Firma (imagen)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      name="firma"
                      onChange={handleFileChange}
                      className="
                      block w-full p-2.5  text-gray-200 rounded
                      file:px-4 file:py-2
                      file:bg-gray-600
                       file:text-gray-200
                      file:border  file:border-gray-500
                      file:rounded file:cursor-pointer
                    file:hover:bg-gray-500
                      transition
                      duration-200 ease-in-out"
                    />
                    {errors.firma && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.firma}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`col-span-2 w-full text-white font-medium rounded-lg p-2.5 text-center ${
                      submitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : " focus:ring-4  bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                    }`}
                  >
                    {submitting ? "Creando..." : "Crear Usuario"}
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
