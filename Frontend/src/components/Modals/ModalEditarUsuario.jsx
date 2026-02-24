// src/components/Modals/ModalEditarUsuario.jsx
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import api from "../../api/index";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function ModalEditarUsuario({
  visible,
  onClose,
  usuario,
  roles = [],
  sucursales = [],
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
    if (texto === "") return "";
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

  useEffect(() => {
    if (!usuario) return;

    const rolIdActual = usuario.rolId ?? usuario.rol_id;
    const cuotaMbActual = usuario.cuotaMb ?? usuario.cuota_mb;
    const sucursalIdActual = usuario.sucursalId ?? usuario.sucursal_id;

    setForm({
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      password: "",
      rol_id: rolIdActual ? String(rolIdActual) : "",
      sucursal_id:
        sucursalIdActual === null || sucursalIdActual === undefined
          ? ""
          : String(sucursalIdActual),
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const nuevo = { ...prev, [name]: value };

      // ✅ si elige admin => limpiar sucursal
      if (name === "rol_id" && String(value) === "1") {
        nuevo.sucursal_id = "";
      }

      return nuevo;
    });
  };

  const handleFileChange = (e) => {
    setFirmaArchivo(e.target.files[0] || null);
  };

  const esAdminSeleccionado = String(form.rol_id) === "1";

  useEffect(() => {
    if (!usuario) return;

    if (esAdminSeleccionado) {
      setCuotaMbVista("∞");
      setForm((prev) => ({ ...prev, cuotaMb: "ilimitado" }));
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
    if (form.password && form.password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    // ✅ sucursal obligatoria si NO es admin
    if (!esAdminSeleccionado && !String(form.sucursal_id || "").trim()) {
      setErrorMsg("La sucursal es obligatoria para usuarios que no sean admin");
      return false;
    }

    // cuota
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

    const rolIdActual = usuario?.rolId ?? usuario?.rol_id;
    const sucursalIdActual = usuario?.sucursalId ?? usuario?.sucursal_id;

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

    if (String(form.rol_id) !== String(rolIdActual ?? "")) {
      data.append("rol_id", form.rol_id);
      cambios = true;
    }

    // ✅ sucursal solo si NO es admin
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

                {/* ... tu bloque de cuotaMb y firma queda igual ... */}

                <div className="col-span-2 flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full p-2.5 text-white font-medium rounded-lg ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
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
