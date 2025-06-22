import { useState, useEffect } from "react";
import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Paperclip } from "lucide-react";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";

export default function ModalRegistrarAbono({
  cuentaId,
  usuarioId,
  onCancel, // cierra este modal
  onRefreshTotals, // <— nueva prop para refrescar totales
}) {
  const [form, setForm] = useState({
    monto_abonado: "",
    moneda_pago: "USD",
    tasa_cambio: "",
    fecha_abono: new Date().toISOString().split("T")[0],
    observaciones: "",
  });
  const [archivo, setArchivo] = useState(null);
  const [saldoPendiente, setSaldoPendiente] = useState(null);
  const [cargandoTasa, setCargandoTasa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [montoUSD, setMontoUSD] = useState("");

  // Estados para controlar los modales de resultado
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  // 1. Carga saldo pendiente
  useEffect(() => {
    if (!cuentaId) return;
    api
      .get(`/cuentas/${cuentaId}/saldo`)
      .then((res) => setSaldoPendiente(res.data.saldo))
      .catch(() => setError("No se pudo obtener el saldo pendiente."));
  }, [cuentaId]);

  // 2. Carga tasa si es VES
  useEffect(() => {
    if (form.moneda_pago !== "VES") {
      setForm((f) => ({ ...f, tasa_cambio: "" }));
      setMontoUSD("");
      return;
    }
    setCargandoTasa(true);
    api
      .get("https://ve.dolarapi.com/v1/dolares/oficial")
      .then((res) => {
        const t = res.data?.promedio;
        if (t) setForm((f) => ({ ...f, tasa_cambio: t.toFixed(4) }));
      })
      .catch(() => setError("No se pudo obtener la tasa del día."))
      .finally(() => setCargandoTasa(false));
  }, [form.moneda_pago]);

  // 3. Calcula USD
  useEffect(() => {
    if (form.moneda_pago === "VES" && form.tasa_cambio && form.monto_abonado) {
      setMontoUSD((form.monto_abonado / form.tasa_cambio).toFixed(2));
    } else {
      setMontoUSD("");
    }
  }, [form.monto_abonado, form.tasa_cambio, form.moneda_pago]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setArchivo(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const monto = parseFloat(form.monto_abonado);
    if (!monto || monto <= 0) {
      return setError("Debe ingresar un monto válido.");
    }
    if (saldoPendiente != null && monto > saldoPendiente) {
      return setError("El monto no puede superar el saldo pendiente.");
    }
    if (form.moneda_pago === "VES" && !form.tasa_cambio) {
      return setError("No se pudo obtener la tasa del día.");
    }

    setIsSubmitting(true);
    try {
      // FormData para incluir archivo
      const data = new FormData();
      data.append("monto", monto);
      data.append("moneda", form.moneda_pago);
      data.append(
        "tasa_cambio",
        form.moneda_pago === "VES" ? parseFloat(form.tasa_cambio) : 1
      );
      data.append("fecha", form.fecha_abono);
      if (form.observaciones) data.append("observaciones", form.observaciones);
      if (archivo) data.append("comprobante", archivo);

      const res = await api.post(`/cuentas/${cuentaId}/abonos`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.status === 201 || res.status === 200) {
        // Muestro modal de éxito
        setShowSuccess(true);
        // Refresco totales
        onRefreshTotals?.();
      } else {
        // En cualquier código inesperado trato como error
        setShowError(true);
      }
    } catch (err) {
      console.error("Error al registrar abono:", err);
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cuando cierran el modal de éxito o error, cerramos este modal
  const handleCloseResult = () => {
    setShowSuccess(false);
    setShowError(false);
    onCancel();
  };

  return (
    <>
      {/* Modal de resultado */}
      {showSuccess && (
        <ModalExito
          titulo="Abono registrado"
          mensaje="El abono fue procesado correctamente."
          textoBoton="Entendido"
          onClose={handleCloseResult}
        />
      )}
      {showError && (
        <ModalError
          titulo="Error"
          mensaje="No se pudo registrar el abono."
          textoBoton="Cerrar"
          onClose={handleCloseResult}
        />
      )}

      {/* Modal de formulario */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        >
          <div className="relative p-4 w-full max-w-2xl">
            <div className="bg-gray-800 rounded-lg shadow-md p-6 w-125">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">
                    Registrar Abono
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error de validación */}
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {/* Campos de monto, moneda, tasa, etc. */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white">
                      Saldo Pendiente (USD)
                    </label>
                    <input
                      type="text"
                      value={
                        saldoPendiente != null
                          ? `$${saldoPendiente.toFixed(2)}`
                          : ""
                      }
                      readOnly
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white">
                      Monto a abonar
                    </label>
                    <input
                      type="number"
                      name="monto_abonado"
                      value={form.monto_abonado}
                      onChange={handleChange}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white">Moneda</label>
                    <select
                      name="moneda_pago"
                      value={form.moneda_pago}
                      onChange={handleChange}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    >
                      <option value="USD">USD</option>
                      <option value="VES">VES</option>
                    </select>
                  </div>
                  {form.moneda_pago === "VES" && (
                    <>
                      <div>
                        <label className="block text-sm text-white">
                          Tasa de cambio
                        </label>
                        <input
                          type="text"
                          value={form.tasa_cambio}
                          readOnly
                          className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white">
                          Equivalente USD
                        </label>
                        <input
                          type="text"
                          value={montoUSD}
                          readOnly
                          className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Fecha y comprobante */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white">
                      Fecha del abono
                    </label>
                    <input
                      type="date"
                      name="fecha_abono"
                      value={form.fecha_abono}
                      onChange={handleChange}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white">
                      Comprobante
                    </label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="file"
                        name="comprobante"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4
                                   file:rounded file:border-0 file:text-sm file:font-semibold
                                   file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                      />
                      <Paperclip className="w-5 h-5 text-gray-400" />
                    </div>
                    {archivo && (
                      <p className="mt-1 text-xs text-gray-300 truncate">
                        {archivo.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm text-white">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    rows={3}
                    value={form.observaciones}
                    onChange={handleChange}
                    className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600 resize-none"
                  />
                </div>

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full p-2 text-white rounded font-medium ${
                    isSubmitting
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Registrando..." : "Registrar Abono"}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
