import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../api/index";
import { Building2, X } from "lucide-react";
import ModalExito from "./ModalExito";

export default function ModalCrearSucursal({ visible, onCancel, onSuccess }) {
  // Estado inicial del formulario (camelCase y en español)
  const formularioInicial = {
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

  const [formulario, setFormulario] = useState(formularioInicial);
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  // Reiniciar al abrir
  useEffect(() => {
    if (visible) {
      setFormulario(formularioInicial);
      setErrores({});
      setErrorServidor("");
    }
  }, [visible]);

  // Manejar cambios de inputs
  const manejarCambio = ({ target: { name, value } }) => {
    setFormulario((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: undefined }));
    if (errorServidor) setErrorServidor("");
  };

  // Validación mínima en cliente
  const validar = () => {
    const nuevosErrores = {};
    if (!formulario.codigo.trim())
      nuevosErrores.codigo = "Código es obligatorio";
    if (!formulario.nombre.trim())
      nuevosErrores.nombre = "Nombre es obligatorio";
    if (!formulario.direccion.trim())
      nuevosErrores.direccion = "Dirección es obligatoria";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Parser de mensajes del backend (incluye duplicados)
  const construirMensajeError = (err) => {
    const data = err?.response?.data;
    const msgPlano =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : "") ||
      "";

    // Listado de errores del backend (si existiera)
    if (Array.isArray(data?.errores) && data.errores.length > 0) {
      return [
        data.message || "Error de validación.",
        ...data.errores.map((e) => `- ${e}`),
      ].join("\n");
    }

    // Duplicados MySQL u otros
    const esDuplicado =
      data?.code === "ER_DUP_ENTRY" ||
      /duplicad/i.test(msgPlano) ||
      /Duplicate entry/i.test(msgPlano);

    if (esDuplicado) {
      // Intentar detectar el índice/campo
      const clave =
        msgPlano.match(/for key '(.+?)'/i)?.[1] ||
        msgPlano.match(/key\s+(.+?)'/i)?.[1] ||
        "";
      // Heurística por nombre del índice/columna
      if (/codigo/i.test(clave))
        return "El código de sucursal ya existe. Usa otro.";
      if (/nombre/i.test(clave))
        return "El nombre de sucursal ya existe. Usa otro.";
      return "Registro duplicado: ya existe una sucursal con esos datos.";
    }

    if (msgPlano) return msgPlano;
    if (!err?.response) return "Error de conexión con el servidor.";
    return "Ocurrió un error al crear la sucursal.";
  };

  // Enviar formulario
  const manejarSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validar()) return;

    setEnviando(true);
    try {
      await api.post("/sucursales", formulario, { withCredentials: true });
      setMostrarExito(true);
    } catch (err) {
      setErrorServidor(construirMensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Modal de éxito se mantiene */}
      <ModalExito
        visible={mostrarExito}
        onClose={() => {
          setMostrarExito(false);
          onSuccess?.();
        }}
        titulo="Sucursal creada"
        mensaje="Se guardó correctamente."
        textoBoton="Continuar"
      />

      <AnimatePresence>
        {visible && !mostrarExito && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !enviando && onCancel?.()}
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
                onClick={() => !enviando && onCancel?.()}
                disabled={enviando}
                className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center mb-4">
                <Building2 className="w-8 h-8 text-blue-500" />
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Crear Nueva Sucursal
                </h3>
              </div>

              <form onSubmit={manejarSubmit} className="space-y-4">
                {/* Aviso pequeño inline (en vez de ModalError) */}
                {errorServidor && (
                  <div className="p-3 bg-red-100 text-red-700 rounded whitespace-pre-line">
                    {errorServidor}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Código *
                    </label>
                    <input
                      name="codigo"
                      value={formulario.codigo}
                      onChange={manejarCambio}
                      placeholder="Ej: Sucursal-001"
                      required
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                    {errores.codigo && (
                      <p className="mt-1 text-sm text-red-600">
                        {errores.codigo}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Nombre *
                    </label>
                    <input
                      name="nombre"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      placeholder="Ej: Sucursal Central"
                      required
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                    {errores.nombre && (
                      <p className="mt-1 text-sm text-red-600">
                        {errores.nombre}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Dirección *
                    </label>
                    <input
                      name="direccion"
                      value={formulario.direccion}
                      onChange={manejarCambio}
                      placeholder="Ej: Av. Principal, Edificio XYZ"
                      required
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                    {errores.direccion && (
                      <p className="mt-1 text-sm text-red-600">
                        {errores.direccion}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Ciudad
                    </label>
                    <input
                      name="ciudad"
                      value={formulario.ciudad}
                      onChange={manejarCambio}
                      placeholder="Ej: Caracas"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Estado/Provincia
                    </label>
                    <input
                      name="estado_provincia"
                      value={formulario.estado_provincia}
                      onChange={manejarCambio}
                      placeholder="Ej: Miranda"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300">
                      País
                    </label>
                    <input
                      name="pais"
                      value={formulario.pais}
                      onChange={manejarCambio}
                      placeholder="Ej: Venezuela"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Teléfono
                    </label>
                    <input
                      name="telefono"
                      value={formulario.telefono}
                      onChange={manejarCambio}
                      placeholder="Ej: +58 123 4567890"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formulario.email}
                      onChange={manejarCambio}
                      placeholder="Ej: correo@email.com"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Responsable
                    </label>
                    <input
                      name="responsable"
                      value={formulario.responsable}
                      onChange={manejarCambio}
                      placeholder="Ej: Juan Pérez"
                      className="border text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className={`cursor-pointer w-full py-2 px-4 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    enviando
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {enviando ? "Guardando..." : "Crear Sucursal"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
