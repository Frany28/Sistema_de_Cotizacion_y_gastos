import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CreditCard } from "lucide-react";
import api from "../../api/index";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

api.defaults.baseURL = import.meta.env.VITE_API_URL;

/** Fecha local compatible con datetime-local */
const nowLocalISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

/** 📌 Formato LATAM (punto miles, coma decimales) */
const formatoLatam = (valor) => {
  const numero = Number(valor) || 0;
  return numero
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function ModalRegistrarPago({
  visible,
  solicitudId,
  onClose,
  onPaid,
}) {
  const [detalle, setDetalle] = useState(null);
  const [banks, setBanks] = useState([]);
  const [firmaURL, setFirmaURL] = useState(null);
  const [form, setForm] = useState({
    metodo_pago: "",
    banco_id: "",
    referencia_pago: "",
    fecha_pago: "",
    comprobante: null,
    observaciones: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalExito, setModalExito] = useState({ visible: false, mensaje: "" });
  const [modalError, setModalError] = useState({ visible: false, mensaje: "" });

  const fileInputRef = useRef(null);

  /** Precargar fecha actual al abrir */
  useEffect(() => {
    if (visible) {
      setForm((prev) => ({ ...prev, fecha_pago: nowLocalISO() }));
    }
  }, [visible]);

  /** Cargar detalle y bancos */
  useEffect(() => {
    if (!visible) return;

    (async () => {
      try {
        const { data } = await api.get(`/solicitudes-pago/${solicitudId}`, {
          withCredentials: true,
        });

        if (data.estado === "pagada") {
          setModalError({
            visible: true,
            mensaje: "Esta solicitud ya está pagada y no se puede modificar.",
          });
          return;
        }

        setDetalle(data);
        setBanks(data.bancosDisponibles || []);
        setForm((prev) => ({
          ...prev,
          banco_id: data.bancosDisponibles?.[0]?.id || "",
        }));

        if (data.usuario_firma) {
          setFirmaURL(`${api.defaults.baseURL}${data.usuario_firma}`);
        }
      } catch (error) {
        console.error("Error al cargar detalle:", error);
        setModalError({
          visible: true,
          mensaje:
            "Error al cargar el detalle: " +
            (error.response?.data?.message || error.message),
        });
      }
    })();
  }, [visible, solicitudId]);

  /** Manejo de cambios */
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    const newForm = { ...form, [name]: files ? files[0] : value };

    if (name === "metodo_pago" && value === "Efectivo") {
      newForm.banco_id = "";
      newForm.comprobante = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    setForm(newForm);
  };

  /** Enviar pago */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fechaPago = form.fecha_pago || nowLocalISO();

      const formData = new FormData();
      formData.append("metodo_pago", form.metodo_pago);

      if (form.metodo_pago !== "Efectivo") {
        formData.append("banco_id", form.banco_id);
        formData.append("referencia_pago", form.referencia_pago);

        if (!form.comprobante) {
          throw new Error("Debe adjuntar el comprobante de pago.");
        }
        formData.append("comprobante", form.comprobante, form.comprobante.name);
      } else {
        formData.append("referencia_pago", form.referencia_pago);
      }

      formData.append("fecha_pago", fechaPago);
      formData.append("observaciones", form.observaciones);

      const url = `/solicitudes-pago/${solicitudId}/pagar`;
      const { data } = await api.patch(url, formData, {
        withCredentials: true,
      });

      setModalExito({ visible: true, mensaje: data.message });
    } catch (err) {
      console.error("Error al registrar pago:", err);
      setModalError({
        visible: true,
        mensaje:
          err.response?.data?.message ||
          err.message ||
          "No se pudo registrar el pago. Intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 📌 Formatear monto pendiente */
  const montoPendiente = detalle
    ? `${formatoLatam(detalle.monto_total)} ${
        detalle.moneda === "VES" ? "Bs" : detalle.moneda
      }`
    : "0,00 Bs";

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer absolute top-3 right-3 text-gray-400  hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-4">
                <CreditCard className="mx-auto mb-2 text-blue-600 w-10 h-10" />
                <h3 className="text-1xl font-semibold text-white">
                  Registrar Pago
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                {/* Monto pendiente */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Monto a Pagar
                  </label>
                  <input
                    type="text"
                    value={montoPendiente}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none"
                  />
                </div>

                {/* Método de pago */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    name="metodo_pago"
                    value={form.metodo_pago}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="cursor-pointer w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                    required
                  >
                    <option value="">Seleccionar método...</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>

                {/* Banco */}
                {form.metodo_pago !== "Efectivo" && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Banco
                    </label>
                    {detalle ? (
                      <select
                        name="banco_id"
                        value={form.banco_id}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="cursor-pointer w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
                        focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                        required={form.metodo_pago !== "Efectivo"}
                      >
                        <option value="">Seleccionar banco...</option>
                        {banks.length > 0 ? (
                          banks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nombre} ({b.identificador})
                            </option>
                          ))
                        ) : (
                          <option disabled>No hay bancos disponibles</option>
                        )}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-500">Cargando bancos…</p>
                    )}
                  </div>
                )}

                {/* Referencia */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Referencia de Pago
                  </label>
                  <input
                    type="text"
                    name="referencia_pago"
                    value={form.referencia_pago}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder={
                      form.metodo_pago === "Efectivo"
                        ? "Ej: Recibo #123"
                        : "Número de transferencia, cheque, etc."
                    }
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
                    focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                    required={form.metodo_pago !== "Efectivo"}
                  />
                </div>

                {/* Fecha */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="datetime-local"
                    name="fecha_pago"
                    value={form.fecha_pago}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
                    focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                    required
                  />
                </div>

                {/* Comprobante */}
                {form.metodo_pago !== "Efectivo" && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Comprobante (PDF/Imagen)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="comprobante"
                      accept="application/pdf,image/*"
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="w-full text-sm text-gray-400 
                      file:mr-4 file:py-2 file:px-4 
                      file:rounded-md file:border-0 
                      file:text-sm file:font-semibold 
                      file:bg-gray-700 file:text-gray-300 
                      hover:file:bg-gray-600 focus:outline-none"
                      required={form.metodo_pago !== "Efectivo"}
                    />
                  </div>
                )}

                {/* Observaciones */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
                    focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                  />
                </div>

                {/* Firma */}
                {firmaURL && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Firma del solicitante
                    </label>
                    <img
                      src={firmaURL}
                      alt="Firma del solicitante"
                      className="border border-gray-300 rounded w-[300px] h-[120px] 
                      object-contain bg-white"
                    />
                  </div>
                )}

                {/* Botones */}
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 text-sm font-medium text-gray-200 
                    bg-gray-700 border border-gray-500 rounded-lg hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 text-sm font-medium 
                    text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    {isSubmitting ? "Registrando..." : "Registrar Pago"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal exito */}
      <ModalExito
        visible={modalExito.visible}
        onClose={() => {
          setModalExito({ visible: false, mensaje: "" });
          onPaid();
          onClose();
        }}
        titulo="Pago Registrado"
        mensaje={modalExito.mensaje}
      />

      {/* Modal error */}
      <ModalError
        visible={modalError.visible}
        onClose={() => setModalError({ visible: false, mensaje: "" })}
        titulo="Error"
        mensaje={modalError.mensaje}
      />
    </>
  );
}
