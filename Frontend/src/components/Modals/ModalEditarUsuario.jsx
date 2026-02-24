// src/components/Modals/ModalEditarUsuario.jsx
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
  onUsuarioActualizado,
}) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol_id: "",
    sucursal_id: "",
    estado: "",
    cuotaMb: "",
    firma: null,
  });

  const [sucursales, setSucursales] = useState([]);

  // ─────────────────────────────────────────────
  // Cuota MB: input "tipo banco" + MB + ∞
  // ─────────────────────────────────────────────
  const [cuotaMbVista, setCuotaMbVista] = useState("");

  const formatearEnteroBanco = (valor) => {
    const soloDigitos = String(valor ?? "").replace(/[^\d]/g, "");
    if (!soloDigitos) return "";
    const numero = Number(soloDigitos);
    if (!Number.isFinite(numero)) return "";
    return new Intl.NumberFormat("es-ES").format(numero);
  };

  const normalizarCuotaParaEnviar = (valorVista) => {
    const texto = String(valorVista ?? "").trim();

    // vacío => no cambiar (tu lógica actual)
    if (texto === "") return "";

    // ∞ o ilimitado => ilimitado
    if (texto === "∞" || texto.toLowerCase() === "ilimitado")
      return "ilimitado";

    const sinMb = texto.replace(/mb/gi, "").trim();
    const soloDigitos = sinMb.replace(/[^\d]/g, "");
    if (!soloDigitos) return "";

    return String(Number(soloDigitos));
  };

  const [firmaArchivo, setFirmaArchivo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Carga inicial de datos en el formulario
  useEffect(() => {
    if (!usuario) return;

    const rolIdActual = usuario.rolId ?? usuario.rol_id;
    const cuotaMbActual = usuario.cuotaMb ?? usuario.cuota_mb;

    setForm({
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      password: "",
      rol_id: rolIdActual ? String(rolIdActual) : "",
      sucursal_id: usuario.sucursalId ? String(usuario.sucursalId) : "",
      estado: usuario.estado || "activo",
      cuotaMb:
        cuotaMbActual === null || cuotaMbActual === undefined
          ? "ilimitado"
          : String(cuotaMbActual),
      firma: usuario.firma || null,
    });

    if (cuotaMbActual === null || cuotaMbActual === undefined) {
      setCuotaMbVista("∞");
    } else {
      setCuotaMbVista(formatearEnteroBanco(cuotaMbActual));
    }

    setFirmaArchivo(null);
  }, [usuario]);

  // Cargar sucursales cuando abre el modal
  useEffect(() => {
    if (!visible) return;

    api
      .get("/sucursales", { withCredentials: true })
      .then(({ data }) => setSucursales(Array.isArray(data) ? data : []))
      .catch(() => setSucursales([]));
  }, [visible]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFirmaArchivo(e.target.files[0] || null);
  };

  const rolIdActual = usuario?.rolId ?? usuario?.rol_id;
  const esAdminSeleccionado = String(form.rol_id) === "1";

  // Si el usuario queda como admin, la cuota se vuelve ∞ y se bloquea
  useEffect(() => {
    if (!usuario) return;

    if (esAdminSeleccionado) {
      setCuotaMbVista("∞");
      setForm((prev) => ({ ...prev, cuotaMb: "ilimitado" }));

      // ✅ Admin no tiene sucursal
      setForm((prev) => ({ ...prev, sucursal_id: "" }));
    } else {
      if (cuotaMbVista === "∞") {
        setCuotaMbVista("");
        setForm((prev) => ({ ...prev, cuotaMb: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rol_id]);

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

    // ✅ Sucursal obligatoria para NO admin (si hay catálogo)
    if (!esAdminSeleccionado && sucursales.length > 0) {
      const sucursalTexto = String(form.sucursal_id ?? "").trim();
      if (!sucursalTexto) {
        setErrorMsg(
          "La sucursal es obligatoria para usuarios que no sean admin",
        );
        return false;
      }
      if (Number.isNaN(Number(sucursalTexto))) {
        setErrorMsg("La sucursal seleccionada no es válida");
        return false;
      }
    }

    if (form.password && form.password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    if (cuotaMbVista !== "") {
      const cuotaEnviar = normalizarCuotaParaEnviar(cuotaMbVista);

      if (cuotaEnviar !== "" && cuotaEnviar !== "ilimitado") {
        const cuotaNumero = Number(cuotaEnviar);
        if (!Number.isFinite(cuotaNumero) || cuotaNumero < 0) {
          setErrorMsg("La cuota debe ser un número >= 0 o ilimitado (∞).");
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

    const rolIdActual = usuario.rolId ?? usuario.rol_id;

    if (form.nombre !== usuario.nombre) {
      data.append("nombre", form.nombre);
      cambios = true;
    }

    if (form.email !== usuario.email) {
      data.append("email", form.email);
      cambios = true;
    }

    if (form.password) {
      data.append("password", form.password);
      cambios = true;
    }

    if (form.rol_id !== String(rolIdActual ?? "")) {
      data.append("rol_id", form.rol_id);
      cambios = true;
    }

    // ✅ Sucursal (solo si NO es admin seleccionado)
    const sucursalIdActual = usuario?.sucursalId ?? usuario?.sucursal_id;
    if (!esAdminSeleccionado) {
      const sucursalActualTexto =
        sucursalIdActual === null || sucursalIdActual === undefined
          ? ""
          : String(sucursalIdActual);

      if (String(form.sucursal_id) !== sucursalActualTexto) {
        data.append("sucursal_id", form.sucursal_id);
        cambios = true;
      }
    }

    if (form.estado !== usuario.estado) {
      data.append("estado", form.estado);
      cambios = true;
    }

    if (firmaArchivo) {
      data.append("firma", firmaArchivo);
      cambios = true;
    }

    const cuotaMbActual = usuario.cuotaMb ?? usuario.cuota_mb;
    const cuotaActualTexto =
      cuotaMbActual === null || cuotaMbActual === undefined
        ? "ilimitado"
        : String(cuotaMbActual);

    const cuotaEnviar = normalizarCuotaParaEnviar(cuotaMbVista);

    if (!esAdminSeleccionado) {
      if (cuotaEnviar !== "") {
        const cuotaEnviarComparable =
          cuotaEnviar === "ilimitado"
            ? "ilimitado"
            : String(Number(cuotaEnviar));

        if (cuotaEnviarComparable !== cuotaActualTexto) {
          data.append("cuotaMb", cuotaEnviar);
          cambios = true;
        }
      }
    }

    if (!cambios) {
      setErrorMsg("No se detectaron cambios para guardar");
      setShowError(true);
      onClose();
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
          "Error al actualizar usuario",
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
              className="relative w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => !isSubmitting && onClose()}
                disabled={isSubmitting}
                className="absolute top-3 right-3 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-4">
                <Pencil className="mx-auto mb-2 text-blue-600 w-10 h-10" />
                <h3 className="text-lg font-semibold text-white">
                  Editar Usuario
                </h3>
              </div>

              <form
                onSubmit={handleSubmit}
                encType="multipart/form-data"
                className="grid grid-cols-2 gap-4"
              >
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

                {/* ✅ Sucursal */}
                {!esAdminSeleccionado && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-white">
                      Sucursal
                    </label>
                    <select
                      name="sucursal_id"
                      value={form.sucursal_id}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="block w-full p-2.5 border rounded-lg bg-gray-600 border-gray-500 text-white"
                    >
                      <option value="">Seleccione sucursal</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.codigo ? `${s.codigo} - ${s.nombre}` : s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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

                {/* (resto del modal igual) */}
                {/* ✅ Almacenamiento */}
                <div className="col-span-2">
                  <label className="block mb-1 text-sm font-medium text-white">
                    Almacenamiento
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      name="cuotaMbVista"
                      value={cuotaMbVista}
                      onChange={(e) => {
                        const valor = e.target.value;

                        if (esAdminSeleccionado) return;

                        if (valor.trim() === "∞") {
                          setCuotaMbVista("∞");
                          setForm((prev) => ({
                            ...prev,
                            cuotaMb: "ilimitado",
                          }));
                          return;
                        }

                        const formateado = formatearEnteroBanco(valor);
                        setCuotaMbVista(formateado);

                        const limpio = normalizarCuotaParaEnviar(formateado);
                        setForm((prev) => ({
                          ...prev,
                          cuotaMb: limpio === "" ? "" : limpio,
                        }));
                      }}
                      disabled={isSubmitting || esAdminSeleccionado}
                      placeholder="Ej: 12.000"
                      className="block w-full p-2.5 pr-14 border rounded-lg bg-gray-600 border-gray-500 text-white disabled:opacity-60"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-200/80">
                      {cuotaMbVista === "∞" ? "" : "MB"}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting || esAdminSeleccionado}
                      onClick={() => {
                        if (esAdminSeleccionado) return;
                        setCuotaMbVista("∞");
                        setForm((prev) => ({ ...prev, cuotaMb: "ilimitado" }));
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-60"
                    >
                      Ilimitado (∞)
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting || esAdminSeleccionado}
                      onClick={() => {
                        if (esAdminSeleccionado) return;
                        setCuotaMbVista("");
                        setForm((prev) => ({ ...prev, cuotaMb: "" }));
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-60"
                    >
                      No cambiar
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-gray-200/70">
                    {esAdminSeleccionado
                      ? "Admin siempre es ilimitado (∞). Cambia el rol si necesitas asignar cuota."
                      : "Dejar vacío = no cambia. Usa el botón “Ilimitado (∞)” si no deseas límite."}
                  </p>
                </div>

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

                <div className="col-span-2 flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full p-2.5 text-white font-medium rounded-lg ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-800"
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
