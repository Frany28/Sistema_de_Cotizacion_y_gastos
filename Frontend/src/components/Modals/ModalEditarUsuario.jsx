// src/components/Modals/ModalEditarUsuario.jsx
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import api from "../../api/index";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

export default function ModalEditarUsuario({
  visible,
  onClose,
  usuario,
  roles = [],
  onUsuarioActualizado,
}) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    rol_id: "",
    estado: "",
    firma: null,
  });
  const [firmaArchivo, setFirmaArchivo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Carga inicial
  useEffect(() => {
    if (usuario) {
      setForm({
        nombre: usuario.nombre || "",
        email: usuario.email || "",
        rol_id: usuario.rol_id?.toString() || "",
        estado: usuario.estado || "activo",
        firma: usuario.firma || null,
      });
      setFirmaArchivo(null);
    }
  }, [usuario]);

  // CORRECCIÓN: usar ...prev en lugar de .prev
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFirmaArchivo(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Sólo los campos que cambien
    const data = new FormData();
    let cambios = false;

    if (form.nombre !== usuario.nombre) {
      data.append("nombre", form.nombre);
      cambios = true;
    }
    if (form.email !== usuario.email) {
      data.append("email", form.email);
      cambios = true;
    }
    if (form.rol_id !== String(usuario.rol_id)) {
      data.append("rol_id", form.rol_id);
      cambios = true;
    }
    if (form.estado !== usuario.estado) {
      data.append("estado", form.estado);
      cambios = true;
    }
    if (firmaArchivo) {
      data.append("firma", firmaArchivo);
      cambios = true;
    }

    if (!cambios) {
      setErrorMsg("No se detectaron cambios");
      setShowError(true);
      setIsSubmitting(false);
      return;
    }

    try {
      await api.put(`/usuarios/${usuario.id}`, data, {
        withCredentials: true,
      });

      setShowExito(true); // mostrar modal de éxito
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error al actualizar usuario");
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitoClose = () => {
    setShowExito(false);
    onClose();
    onUsuarioActualizado();
  };
  const handleErrorClose = () => setShowError(false);

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
        titulo="Usuario actualizado"
        mensaje="Los cambios se guardaron correctamente"
        textoBoton="Continuar"
      />

      <AnimatePresence>
        {visible && !showExito && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onClose()}
          >
            <motion.div
              className="relative w-full max-w-lg p-6  bg-gray-800 rounded-lg shadow"
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
                <Pencil className="mx-auto mb-2 text-blue-600 w-10 h-10" />
                <h3 className="text-lg font-semibold  text-white">
                  Editar Usuario
                </h3>
              </div>

              <form
                onSubmit={handleSubmit}
                encType="multipart/form-data"
                className="grid grid-cols-2 gap-4"
              >
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
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
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
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  >
                    <option value="">Seleccione rol</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block mb-1 text-sm font-medium  text-white">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                {/* Firma previa (si existe) */}
                {form.firma && !firmaArchivo && (
                  <div className="col-span-2">
                    <label className="block mb-1 text-sm font-medium text-white">
                      Firma previa
                    </label>
                    <a
                      href={form.firma}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block underline text-blue-600 mb-2"
                    >
                      {form.firma.split("/").pop()}
                    </a>
                  </div>
                )}

                {/* Input para subir/cambiar firma */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium text-white">
                    {form.firma && !firmaArchivo
                      ? "Cambiar firma (imagen)"
                      : "Firma (imagen)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5  border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Botón */}
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
