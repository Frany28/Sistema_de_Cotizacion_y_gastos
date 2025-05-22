import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../api/index";
import { Building2, X } from "lucide-react";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

export default function ModalCrearSucursal({ visible, onCancel, onSuccess }) {
  const initialForm = {
    codigo: "",
    nombre: "",
    direccion: "",
    ciudad: "",
    estado_provincia: "",
    pais: "",
    telefono: "",
    email: "",
    responsable: "",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialForm);
      setErrors({});
      setServerError("");
      setShowError(false);
    }
  }, [visible]);

  const handleChange = ({ target: { name, value } }) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.codigo.trim()) errs.codigo = "Código es obligatorio";
    if (!form.nombre.trim()) errs.nombre = "Nombre es obligatorio";
    if (!form.direccion.trim()) errs.direccion = "Dirección es obligatoria";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/sucursales", form, { withCredentials: true });
      setShowExito(true);
    } catch (err) {
      setServerError(err.response?.data?.error || "Error al crear sucursal");
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalError
        visible={showError}
        onClose={() => setShowError(false)}
        titulo="Error"
        mensaje={serverError}
        textoBoton="Entendido"
      />
      <ModalExito
        visible={showExito}
        onClose={() => {
          setShowExito(false);
          onSuccess();
        }}
        titulo="Sucursal creada"
        mensaje="Se guardó correctamente"
        textoBoton="Continuar"
      />
      <AnimatePresence>
        {visible && !showExito && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onCancel()}
          >
            <motion.div
              className=" bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 relative"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => !isSubmitting && onCancel()}
                disabled={isSubmitting}
                className="absolute top-4 right-4 text-gray-400  hover:text-gray-200"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center mb-4">
                <Building2 className="w-8 h-8 text-blue-500" />
                <h3 className="mt-2 text-lg font-semibold  text-white">
                  Crear Nueva Sucursal
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {serverError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded">
                    {serverError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300">
                      Código *
                    </label>
                    <input
                      name="codigo"
                      value={form.codigo}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.codigo && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.codigo}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300">
                      Nombre *
                    </label>
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.nombre && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.nombre}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300">
                      Dirección *
                    </label>
                    <input
                      name="direccion"
                      value={form.direccion}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.direccion && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.direccion}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium  text-gray-300">
                      Ciudad
                    </label>
                    <input
                      name="ciudad"
                      value={form.ciudad}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium  text-gray-300">
                      Estado/Provincia
                    </label>
                    <input
                      name="estado_provincia"
                      value={form.estado_provincia}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300">
                      País
                    </label>
                    <input
                      name="pais"
                      value={form.pais}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium  text-gray-300">
                      Teléfono
                    </label>
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium  text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300">
                      Responsable
                    </label>
                    <input
                      name="responsable"
                      value={form.responsable}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md  border-gray-600 bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Guardando..." : "Crear Sucursal"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
