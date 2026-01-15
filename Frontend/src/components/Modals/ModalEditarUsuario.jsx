import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../api/api";

import ModalError from "../modales/ModalError";
import ModalExito from "../modales/ModalExito";

export default function ModalEditarUsuario({
  visible,
  onClose,
  usuario,
  roles,
  puedeEditarCuota,
  onUsuarioActualizado,
}) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol_id: "",
    estado: "",
    firma: null,
    cuotaMb: "",
  });

  const [firmaArchivo, setFirmaArchivo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showExito, setShowExito] = useState(false);

  useEffect(() => {
    if (usuario) {
      setForm({
        nombre: usuario.nombre || "",
        email: usuario.email || "",
        password: "",
        rol_id: usuario.rolId ? String(usuario.rolId) : "",
        estado: usuario.estado || "activo",
        firma: usuario.firma || null,
        cuotaMb:
          usuario.cuotaMb === null || usuario.cuotaMb === undefined
            ? ""
            : String(usuario.cuotaMb),
      });
      setFirmaArchivo(null);
    }
  }, [usuario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFirmaArchivo(e.target.files[0] || null);
  };

  const validarFormulario = () => {
    if (!form.nombre?.trim()) return false;
    if (!form.email?.trim()) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      setShowError(true);
      setErrorMsg("Verifica nombre y correo.");
      onClose();
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    let cambios = false;

    // Nombre
    if (form.nombre !== usuario.nombre) {
      data.append("nombre", form.nombre);
      cambios = true;
    }

    // Email
    if (form.email !== usuario.email) {
      data.append("email", form.email);
      cambios = true;
    }

    // Password
    if (form.password?.trim()) {
      data.append("password", form.password);
      cambios = true;
    }

    // Rol
    if (String(form.rol_id) !== String(usuario.rolId)) {
      data.append("rol_id", form.rol_id);
      cambios = true;
    }

    // Estado
    if (form.estado !== usuario.estado) {
      data.append("estado", form.estado);
      cambios = true;
    }

    // Nueva firma
    if (firmaArchivo) {
      data.append("firma", firmaArchivo);
      cambios = true;
    }

    // Cuota (opción 1): se actualiza por endpoint separado y requiere permiso
    let cambioCuota = false;
    let cuotaForm = null;

    if (puedeEditarCuota) {
      cuotaForm = form.cuotaMb === "" ? null : Number(form.cuotaMb);
      const cuotaActual =
        usuario.cuotaMb === undefined ? null : usuario.cuotaMb ?? null;

      cambioCuota =
        (cuotaActual === null && cuotaForm !== null) ||
        (cuotaActual !== null && cuotaForm === null) ||
        (cuotaActual !== null &&
          cuotaForm !== null &&
          cuotaActual !== cuotaForm);
    }

    if (!cambios && !cambioCuota) {
      setErrorMsg("No se detectaron cambios para guardar");
      setShowError(true);
      onClose();
      setIsSubmitting(false);
      return;
    }

    try {
      // 1) Actualizar datos generales del usuario (solo si hay cambios)
      if (cambios) {
        await api.put(`/usuarios/${usuario.id}`, data, {
          withCredentials: true,
        });
      }

      // 2) Actualizar cuota (solo si cambió y tiene permiso)
      if (cambioCuota) {
        await api.put(
          `/usuarios/${usuario.id}/cuota`,
          { cuotaMb: cuotaForm },
          { withCredentials: true }
        );
      }

      setShowExito(true);
      onClose();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Error al actualizar usuario"
      );
      setShowError(true);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitoClose = () => {
    setShowExito(false);
    onUsuarioActualizado?.();
  };

  if (!usuario) return null;

  return (
    <>
      <ModalError
        visible={showError}
        onClose={() => setShowError(false)}
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
        {visible && !showExito && !showError && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-700 rounded-lg shadow-lg w-full max-w-2xl p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Editar usuario
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                encType="multipart/form-data"
                className="grid grid-cols-2 gap-4"
              >
                {/* Nombre */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-white">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-white">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Contraseña */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium text-white">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Dejar vacío para no cambiar"
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  />
                </div>

                {/* Rol */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-white">
                    Rol
                  </label>
                  <select
                    name="rol_id"
                    value={form.rol_id}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  >
                    <option value="">Seleccione...</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-white">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                {/* ✅ Cuota de almacenamiento (MB) */}
                {puedeEditarCuota && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-white">
                      Cuota de almacenamiento (MB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="cuotaMb"
                      value={form.cuotaMb}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="Vacío = ilimitado"
                      className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                    />
                    <p className="mt-1 text-xs text-gray-300">
                      Deja el campo vacío para cuota ilimitada.
                    </p>
                  </div>
                )}

                {/* Firma previa */}
                {form.firma && !firmaArchivo && (
                  <div className="col-span-2">
                    <label className="block mb-1 text-sm font-medium text-white">
                      Firma previa
                    </label>
                    <a
                      href={form.firma}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-200 underline"
                    >
                      Ver firma
                    </a>
                  </div>
                )}

                {/* Input firma */}
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
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
                    disabled={isSubmitting}
                  >
                    Guardar
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
