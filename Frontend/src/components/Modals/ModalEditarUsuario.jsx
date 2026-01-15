import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import api from "../../api/index";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

// Regex para validar email
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function ModalEditarUsuario({
  visible,
  onClose,
  usuario,
  roles = [],
  esAdmin = false,
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

  const [cuotaIlimitada, setCuotaIlimitada] = useState(false);
  const [firmaArchivo, setFirmaArchivo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Carga inicial de datos en el formulario
  useEffect(() => {
    if (usuario) {
      const cuotaActual = usuario.cuotaMb ?? usuario.cuota_mb;

      setForm({
        nombre: usuario.nombre || "",
        email: usuario.email || "",
        password: "",
        rol_id: usuario.rolId ? String(usuario.rolId) : "",
        estado: usuario.estado || "activo",
        firma: usuario.firma || null,
        cuotaMb:
          cuotaActual === null || cuotaActual === undefined
            ? ""
            : String(cuotaActual),
      });

      setFirmaArchivo(null);
      setCuotaIlimitada(cuotaActual === null);
    }
  }, [usuario]);

  // Si se selecciona rol admin => cuota ilimitada forzada
  useEffect(() => {
    if (!esAdmin) return;
    if (String(form.rol_id) === "1") {
      setCuotaIlimitada(true);
    }
  }, [esAdmin, form.rol_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFirmaArchivo(e.target.files[0] || null);
  };

  const validarFormulario = () => {
    if (!form.nombre.trim()) {
      setErrorMsg("El nombre es obligatorio");
      return false;
    }
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim())) {
      setErrorMsg("El email es obligatorio o tiene formato inválido");
      return false;
    }
    if (form.rol_id !== "" && Number.isNaN(Number(form.rol_id))) {
      setErrorMsg("El rol seleccionado no es válido");
      return false;
    }
    if (form.password && form.password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    // Cuota (solo admin)
    if (esAdmin && String(form.rol_id) !== "1" && !cuotaIlimitada) {
      // Permitir vacío para "no cambiar"
      if (String(form.cuotaMb).trim() !== "") {
        const cuotaMbNumero = Number(form.cuotaMb);
        if (!Number.isFinite(cuotaMbNumero) || cuotaMbNumero < 0) {
          setErrorMsg("La cuota debe ser un número mayor o igual a 0");
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      setShowError(true);
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

    // Contraseña
    if (form.password) {
      data.append("password", form.password);
      cambios = true;
    }

    // Rol
    if (form.rol_id !== String(usuario.rolId)) {
      data.append("rol_id", form.rol_id);
      cambios = true;
    }

    // Estado
    if (form.estado !== usuario.estado) {
      data.append("estado", form.estado);
      cambios = true;
    }

    // Cuota (solo admin)
    if (esAdmin) {
      const cuotaActual = usuario.cuotaMb ?? usuario.cuota_mb;

      // Si queda admin => ilimitado automático, no enviamos cuotaMb
      if (String(form.rol_id) === "1") {
        // noop
      } else if (cuotaIlimitada) {
        if (cuotaActual !== null) {
          data.append("cuotaMb", "null");
          cambios = true;
        }
      } else {
        const cuotaTexto = String(form.cuotaMb ?? "").trim();
        if (cuotaTexto !== "") {
          const cuotaNueva = Number(cuotaTexto);
          const cuotaActualNumero =
            cuotaActual === null || cuotaActual === undefined
              ? null
              : Number(cuotaActual);

          if (cuotaActualNumero === null || cuotaNueva !== cuotaActualNumero) {
            data.append("cuotaMb", String(cuotaNueva));
            cambios = true;
          }
        }
      }
    }

    // Nueva firma
    if (firmaArchivo) {
      data.append("firma", firmaArchivo);
      cambios = true;
    }

    if (!cambios) {
      setErrorMsg("No se detectaron cambios para guardar");
      setShowError(true);
      setIsSubmitting(false);
      return;
    }

    try {
      await api.put(`/usuarios/${usuario.id}`, data, { withCredentials: true });
      setShowExito(true);
      onClose();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Error al actualizar usuario"
      );
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitoClose = () => {
    setShowExito(false);
    onUsuarioActualizado?.();
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
        {visible && !showExito && !showError && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onClose()}
          >
            <motion.div
              className="relative bg-gray-800 rounded-lg shadow p-6 w-full max-w-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-white">
                    Editar Usuario
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !isSubmitting && onClose()}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                    Nueva contraseña
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

                {/* Cuota (solo admin) */}
                {esAdmin && (
                  <div className="col-span-2">
                    <label className="block mb-1 text-sm font-medium text-white">
                      Cuota de almacenamiento (MB)
                    </label>

                    {String(form.rol_id) === "1" ? (
                      <p className="text-sm text-gray-300">
                        Este usuario es Administrador → almacenamiento
                        ilimitado.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={cuotaIlimitada}
                            onChange={() => setCuotaIlimitada((v) => !v)}
                            disabled={isSubmitting}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-white">Ilimitado</span>
                        </div>

                        {!cuotaIlimitada && (
                          <input
                            type="number"
                            name="cuotaMb"
                            min="0"
                            step="1"
                            placeholder="Ej: 50"
                            value={form.cuotaMb}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                          />
                        )}

                        <p className="text-xs text-gray-300 mt-1">
                          Deja vacío para no cambiar la cuota.
                        </p>
                      </>
                    )}
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
                      className="block underline text-blue-600 mb-2"
                    >
                      {form.firma.split("/").pop()}
                    </a>
                  </div>
                )}

                {/* Subir/cambiar firma */}
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
                    className="block w-full p-2.5 text-gray-200 rounded file:px-4 file:py-2 file:bg-gray-700 file:text-gray-200 file:border file:border-gray-500 file:rounded file:cursor-pointer file:hover:bg-gray-500 transition duration-200 ease-in-out"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`col-span-2 w-full text-white font-medium rounded-lg p-2.5 text-center ${
                    isSubmitting
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
