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
              className="relative w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => !isSubmitting && onCancel()}
                disabled={isSubmitting}
                className="cursor-pointer absolute top-4 right-4 text-gray-400  hover:text-gray-200"
              >
                <X size={20} />
              </button>
              <div className="cursor-pointer flex flex-col items-center mb-4">
                <Building2 className="w-8 h-8 text-blue-500" />
                <h3 className="mt-2 text-lg font-semibold  text-white">
                  Crear Nueva Sucursal
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {serverError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded ">
                    {serverError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300 ">
                      Código *
                    </label>
                    <input
                      name="codigo"
                      value={form.codigo}
                      onChange={handleChange}
                      placeholder="Ej: Sucursal-001"
                      required
                      className=" border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
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
                      placeholder="Ej: Sucursal Central"
                      required
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
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
                      placeholder="Ej: Av. Principal, Edificio XYZ"
                      required
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
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
                      placeholder="Ej: Caracas"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium  text-gray-300">
                      Estado/Provincia
                    </label>
                    <input
                      name="estado_provincia"
                      value={form.estado_provincia}
                      placeholder="Ej: Miranda"
                      onChange={handleChange}
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
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
                      placeholder="Ej: Venezuela"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
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
                      placeholder="Ej: +58 123 4567890"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium  text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Ej: abg@email.com"
                      value={form.email}
                      onChange={handleChange}
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium  text-gray-300">
                      Responsable
                    </label>
                    <input
                      name="responsable"
                      placeholder="Ej: Juan Pérez"
                      value={form.responsable}
                      onChange={handleChange}
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`cursor-pointer w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
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
