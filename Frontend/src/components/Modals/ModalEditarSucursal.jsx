import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Building2 } from "lucide-react";
import api from "../../api/index";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

const regexCodigo = /^[A-Z0-9]{2,10}$/;
const regexTelefono = /^\+?[0-9\s\-]{7,15}$/;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function ModalEditarSucursal({
  visible,
  onClose,
  sucursal,
  onSucursalActualizada,
}) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    direccion: "",
    ciudad: "",
    estado_provincia: "",
    pais: "",
    telefono: "",
    email: "",
    responsable: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (sucursal) {
      setForm({
        codigo: sucursal.codigo || "",
        nombre: sucursal.nombre || "",
        direccion: sucursal.direccion || "",
        ciudad: sucursal.ciudad || "",
        estado_provincia: sucursal.estado_provincia || "",
        pais: sucursal.pais || "",
        telefono: sucursal.telefono || "",
        email: sucursal.email || "",
        responsable: sucursal.responsable || "",
      });
    }
  }, [sucursal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.codigo.trim()) {
      newErrors.codigo = "El código es requerido";
    } else if (!regexCodigo.test(form.codigo)) {
      newErrors.codigo = "Solo mayúsculas y números (2-10 caracteres)";
    }

    if (!form.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (!form.direccion.trim()) {
      newErrors.direccion = "La dirección es requerida";
    }

    if (form.telefono && !regexTelefono.test(form.telefono)) {
      newErrors.telefono = "Formato de teléfono inválido";
    }

    if (form.email && !regexEmail.test(form.email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkExistingCode = async () => {
    try {
      const response = await api.get("/sucursales/check/codigo", {
        params: { codigo: form.codigo.trim() },
        withCredentials: true,
      });
      return response.data.exists && form.codigo !== sucursal.codigo;
    } catch (error) {
      console.error("Error al verificar código:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const codeExists = await checkExistingCode();
      if (codeExists) {
        setErrorMsg("El código de sucursal ya está en uso");
        setShowError(true);
        setIsSubmitting(false);
        return;
      }

      const cambios = {};
      Object.keys(form).forEach((key) => {
        if (form[key] !== sucursal[key]) {
          cambios[key] = form[key];
        }
      });

      if (Object.keys(cambios).length === 0) {
        setErrorMsg("No se detectaron cambios");
        setShowError(true);
        setIsSubmitting(false);
        return;
      }

      await api.put(`/sucursales/${sucursal.id}`, cambios, {
        withCredentials: true,
      });

      setShowExito(true);
    } catch (error) {
      console.error("Error al actualizar sucursal:", error);
      setErrorMsg(
        error.response?.data?.error ||
          "Error al actualizar la sucursal. Intente nuevamente."
      );
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitoClose = () => {
    setShowExito(false);
    onClose();
    onSucursalActualizada();
  };

  const handleErrorClose = () => {
    setShowError(false);
  };

  return (
    <>
      <ModalError
        visible={showError}
        onClose={handleErrorClose}
        titulo="Error"
        mensaje={errorMsg}
        textoBoton="Entendido"
      />

      <ModalExito
        visible={showExito}
        onClose={handleExitoClose}
        titulo="Sucursal actualizada"
        mensaje="Los cambios se guardaron correctamente"
        textoBoton="Continuar"
      />

      <AnimatePresence>
        {visible && sucursal && !showExito && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onClose()}
          >
            <motion.div
              className="relative w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => !isSubmitting && onClose()}
                disabled={isSubmitting}
                className="cursor-pointer absolute top-3 right-3 text-gray-400  hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-4">
                <Building2 className="mx-auto mb-2 text-blue-600 w-10 h-10" />
                <h3 className="text-lg font-semibold  text-white">
                  Editar Sucursal
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                {/* Código */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Código *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={form.codigo}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                  {errors.codigo && (
                    <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>
                  )}
                </div>

                {/* Nombre */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
                  )}
                </div>

                {/* Dirección */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                  {errors.direccion && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.direccion}
                    </p>
                  )}
                </div>

                {/* Ciudad */}
                <div>
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Estado/Provincia */}
                <div>
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Estado/Provincia
                  </label>
                  <input
                    type="text"
                    name="estado_provincia"
                    value={form.estado_provincia}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* País */}
                <div>
                  <label className="block mb-1 text-sm font-medium  text-white">
                    País
                  </label>
                  <input
                    type="text"
                    name="pais"
                    value={form.pais}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                  {errors.telefono && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telefono}
                    </p>
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
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Responsable */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Responsable
                  </label>
                  <input
                    type="text"
                    name="responsable"
                    value={form.responsable}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Botón de guardar */}
                <div className="col-span-2 flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`cursor-pointer w-full p-2.5 text-white font-medium rounded-lg ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : " focus:ring-4  bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                    }`}
                  >
                    {isSubmitting ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
