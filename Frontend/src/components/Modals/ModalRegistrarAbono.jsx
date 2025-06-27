import { useState, useEffect } from "react";
import api from "../../api/index";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Paperclip } from "lucide-react";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";

// ➜ El backend toma el id del usuario desde la sesión;
// esta vista ya no necesita recibir ni enviar usuarioId.

const dolarApi = axios.create();

export default function ModalRegistrarAbono({
  cuentaId,
  onCancel,
  onRefreshTotals,
}) {
  /* --------------------------------------------------
   *  Estado
   * -------------------------------------------------- */
  const [form, setForm] = useState({
    metodo_pago: "EFECTIVO",
    banco_id: "",
    monto_abonado: "",
    moneda_pago: "USD",
    tasa_cambio: "",
    fecha_abono: new Date().toISOString().split("T")[0],
    observaciones: "",
  });
  const [archivo, setArchivo] = useState(null);
  const [saldoPendiente, setSaldoPendiente] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [montoUSD, setMontoUSD] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [bancosDisponibles, setBancosDisponibles] = useState({});
  const [cargandoBancos, setCargandoBancos] = useState(false);

  /* --------------------------------------------------
   * 1. Cargar saldo pendiente de la cuenta
   * -------------------------------------------------- */
  useEffect(() => {
    if (!cuentaId) return;

    api
      .get(`/cuentas/${cuentaId}/saldo`)
      .then((res) => setSaldoPendiente(res.data.saldo))
      .catch(() => setError("No se pudo obtener el saldo pendiente."));
  }, [cuentaId]);

  /* Ajustar banco al cambiar de moneda */
  useEffect(() => {
    if (form.metodo_pago !== "TRANSFERENCIA") return;
    const candidatos = bancosDisponibles[form.moneda_pago] || [];
    setForm((f) => ({ ...f, banco_id: candidatos[0]?.id || "" }));
  }, [form.moneda_pago, bancosDisponibles, form.metodo_pago]);

  /* --------------------------------------------------
   * 2. Cargar bancos disponibles cuando el método es TRANSFERENCIA
   * -------------------------------------------------- */
  useEffect(() => {
    if (form.metodo_pago !== "TRANSFERENCIA") {
      setBancosDisponibles({});
      return;
    }

    setCargandoBancos(true);
    api
      .get("/bancos", {
        params: { moneda: form.moneda_pago, estado: "activo" },
      })
      .then((res) => {
        const grouped = res.data.bancos.reduce((acc, b) => {
          (acc[b.moneda] ||= []).push(b);
          return acc;
        }, {});
        setBancosDisponibles(grouped);
        const first = grouped[form.moneda_pago]?.[0];
        setForm((f) => ({ ...f, banco_id: first?.id || "" }));
      })
      .catch(() => setError("No se pudo cargar la lista de bancos."))
      .finally(() => setCargandoBancos(false));
  }, [form.metodo_pago, form.moneda_pago]);

  /* --------------------------------------------------
   * 3. Obtener tasa oficial cuando la moneda es VES
   * -------------------------------------------------- */
  useEffect(() => {
    if (form.moneda_pago !== "VES") {
      setForm((f) => ({ ...f, tasa_cambio: "" }));
      setMontoUSD("");
      return;
    }

    dolarApi
      .get("https://ve.dolarapi.com/v1/dolares/oficial")
      .then((res) => {
        const t = res.data?.promedio;
        if (t) setForm((f) => ({ ...f, tasa_cambio: t.toFixed(4) }));
      })
      .catch(() => setError("No se pudo obtener la tasa del día."));
  }, [form.moneda_pago]);

  /* --------------------------------------------------
   * 4. Calcular equivalente en USD cuando sea necesario
   * -------------------------------------------------- */
  useEffect(() => {
    if (form.moneda_pago === "VES" && form.tasa_cambio && form.monto_abonado) {
      setMontoUSD((form.monto_abonado / form.tasa_cambio).toFixed(2));
    } else {
      setMontoUSD("");
    }
  }, [form.moneda_pago, form.tasa_cambio, form.monto_abonado]);

  /* --------------------------------------------------
   * 5. Handlers
   * -------------------------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError("");

    if (name === "metodo_pago" && value === "EFECTIVO") {
      setForm((f) => ({ ...f, banco_id: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setArchivo(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const monto = parseFloat(form.monto_abonado);
    if (!monto || monto <= 0) return setError("Debe ingresar un monto válido.");
    if (saldoPendiente != null && monto > saldoPendiente)
      return setError("El monto no puede superar el saldo pendiente.");
    if (form.moneda_pago === "VES" && !form.tasa_cambio)
      return setError("No se pudo obtener la tasa del día.");
    if (form.metodo_pago === "TRANSFERENCIA" && !form.banco_id)
      return setError("Debe seleccionar un banco para transferencia.");
    if (form.metodo_pago === "TRANSFERENCIA" && !archivo)
      return setError("Debe adjuntar un comprobante para transferencias.");

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append("cuentaId", cuentaId);
      data.append("metodoPago", form.metodo_pago);

      if (form.metodo_pago === "TRANSFERENCIA") {
        data.append("bancoId", form.banco_id);
      }

      data.append("monedaPago", form.moneda_pago);
      data.append("montoAbonado", monto);
      data.append(
        "tasaCambio",
        form.moneda_pago === "VES" ? parseFloat(form.tasa_cambio) : 1
      );
      if (form.observaciones) data.append("observaciones", form.observaciones);
      if (archivo) data.append("comprobante", archivo);

      const res = await api.post(`/cuentas/${cuentaId}/abonos`, data);

      if (res.status === 200 || res.status === 201) {
        setShowSuccess(true);
        onRefreshTotals?.();
      } else {
        setShowError(true);
      }
    } catch {
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseResult = () => {
    setShowSuccess(false);
    setShowError(false);
    onCancel();
  };

  /* --------------------------------------------------
   * 6. UI
   * -------------------------------------------------- */
  return (
    <AnimatePresence mode="wait">
      {/* Success modal */}
      {showSuccess && (
        <ModalExito
          visible={true}
          key="exito"
          titulo="Abono registrado"
          mensaje="El abono fue procesado correctamente."
          textoBoton="Entendido"
          onClose={handleCloseResult}
        />
      )}

      {/* Error modal */}
      {showError && (
        <ModalError
          visible={true}
          key="error"
          titulo="Error"
          mensaje="No se pudo registrar el abono."
          textoBoton="Cerrar"
          onClose={handleCloseResult}
        />
      )}

      {/* Formulario principal */}
      {!showSuccess && !showError && (
        <motion.div
          key="form"
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
                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="grid grid-cols-2 gap-4">
                  {/* Método de pago */}
                  <div>
                    <label className="block text-sm text-white">
                      Método de Pago
                    </label>
                    <select
                      name="metodo_pago"
                      value={form.metodo_pago}
                      onChange={handleChange}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>

                  {/* Banco (solo para transferencia) */}
                  {form.metodo_pago === "TRANSFERENCIA" && (
                    <div>
                      <label className="block text-sm text-white">
                        Banco ({form.moneda_pago})
                      </label>
                      {cargandoBancos ? (
                        <p className="text-sm text-gray-500 mt-1">
                          Cargando bancos...
                        </p>
                      ) : Object.values(bancosDisponibles).flat().length > 0 ? (
                        <select
                          name="banco_id"
                          value={form.banco_id}
                          onChange={handleChange}
                          className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                          required
                        >
                          <option value="">Seleccionar banco…</option>

                          {Object.entries(bancosDisponibles).map(
                            ([divisa, lista]) => (
                              <optgroup key={divisa} label={divisa}>
                                {lista.map((banco) => (
                                  <option key={banco.id} value={banco.id}>
                                    {banco.nombre} ({banco.identificador})
                                  </option>
                                ))}
                              </optgroup>
                            )
                          )}
                        </select>
                      ) : (
                        <p className="text-sm text-red-500 mt-1">
                          No hay bancos disponibles para {form.moneda_pago}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Resto de los campos... */}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white">
                      Fecha del abono
                    </label>
                    <input
                      type="date"
                      name="fecha_abono"
                      value={form.fecha_abono}
                      readOnly
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white">
                      Comprobante{" "}
                      {form.metodo_pago === "TRANSFERENCIA" && "(Obligatorio)"}
                    </label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="file"
                        name="comprobante"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-500"
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full p-2 text-white rounded font-medium ${
                    isSubmitting
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Registrando" : "Registrar Abono"}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
