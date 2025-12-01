import { useState, useEffect } from "react";
import api from "../../api/index";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Paperclip } from "lucide-react";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";


const dolarApi = axios.create();

export default function ModalRegistrarAbono({
  cuentaId,
  onCancel,
  onRefreshTotals,
}) {

  const [form, setForm] = useState({
    metodo_pago: "EFECTIVO",
    banco_id: "",
    moneda_pago: "USD",
    tasa_cambio: 0,
    observaciones: "",
    comprobante: null,
    fecha_abono: new Date().toISOString().split("T")[0],
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

  // Monto tipo cajero: centavos y texto LATAM
  const [montoCentavos, setMontoCentavos] = useState(0);
  const [montoTexto, setMontoTexto] = useState("0,00");

  useEffect(() => {
    if (!cuentaId) return;

    api
      .get(`/cuentas/${cuentaId}/saldo`)
      .then((res) => setSaldoPendiente(parseFloat(res.data.saldo)));
  }, [cuentaId]);

 
  useEffect(() => {
    if (form.metodo_pago !== "TRANSFERENCIA") return;
    const candidatos = bancosDisponibles[form.moneda_pago] || [];
    setForm((f) => ({ ...f, banco_id: candidatos[0]?.id || "" }));
  }, [form.moneda_pago, bancosDisponibles, form.metodo_pago]);

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
        if (t) {
          const tRed = Number(t).toFixed(2);
          setForm((f) => ({ ...f, tasa_cambio: tRed }));
        }
      })
      .catch(() => setError("No se pudo obtener la tasa del día."));
  }, [form.moneda_pago]);

  /* --------------------------------------------------
   * 4. Sincronizar montoTexto y form.monto_abonado desde montoCentavos
   * -------------------------------------------------- */
  useEffect(() => {
    const entero = Math.floor(montoCentavos / 100);
    const decimales = montoCentavos % 100;

    const enterosFormateados = entero.toLocaleString("es-VE", {
      maximumFractionDigits: 0,
    });

    const texto = `${enterosFormateados},${decimales
      .toString()
      .padStart(2, "0")}`;
    setMontoTexto(texto);

    const numeroString = (montoCentavos / 100).toFixed(2); // "1234.56"
    setForm((prev) => ({
      ...prev,
      monto_abonado: numeroString,
    }));
  }, [montoCentavos]);

  /* --------------------------------------------------
   * 5. Calcular equivalente en USD cuando sea necesario
   * -------------------------------------------------- */
  useEffect(() => {
    if (form.moneda_pago === "VES" && form.tasa_cambio && form.monto_abonado) {
      const montoNum = parseFloat(form.monto_abonado);
      const tasaNum = parseFloat(form.tasa_cambio);
      if (!isNaN(montoNum) && !isNaN(tasaNum) && tasaNum > 0) {
        setMontoUSD((montoNum / tasaNum).toFixed(2));
      } else {
        setMontoUSD("");
      }
    } else {
      setMontoUSD("");
    }
  }, [form.moneda_pago, form.tasa_cambio, form.monto_abonado]);

  /* --------------------------------------------------
   * 6. Handlers
   * -------------------------------------------------- */
  const handleKeyDownMonto = (e) => {
    const { key } = e;

    // Permitir tabulación
    if (key === "Tab") return;

    // Evitar submit por Enter
    if (key === "Enter") {
      e.preventDefault();
      return;
    }

    // Backspace: quitar último dígito
    if (key === "Backspace") {
      e.preventDefault();
      setMontoCentavos((prev) => Math.floor(prev / 10));
      if (error) setError("");
      return;
    }

    // Solo dígitos 0–9
    if (key >= "0" && key <= "9") {
      e.preventDefault();
      const digito = Number(key);
      setMontoCentavos((prev) => {
        const nuevo = prev * 10 + digito;
        // límite razonable (999.999.999.999,99)
        if (nuevo > 99999999999999) return prev;
        return nuevo;
      });
      if (error) setError("");
      return;
    }

    // Cualquier otra tecla se bloquea
    e.preventDefault();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // El monto se maneja solo con handleKeyDownMonto
    if (name === "monto_abonado") {
      if (error) setError("");
      return;
    }

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

    const montoEnUsd =
      form.moneda_pago === "USD"
        ? monto
        : monto / parseFloat(form.tasa_cambio || 1);

    if (saldoPendiente != null && montoEnUsd > saldoPendiente)
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
      data.append("metodo_pago", form.metodo_pago);

      if (form.metodo_pago === "TRANSFERENCIA") {
        data.append("banco_id", form.banco_id);
      }

      data.append("moneda_pago", form.moneda_pago);
      data.append("monto_abonado", monto);
      data.append(
        "tasa_cambio",
        form.moneda_pago === "VES" ? parseFloat(form.tasa_cambio) : 1
      );
      if (form.observaciones) data.append("observaciones", form.observaciones);
      data.append("fecha_abono", form.fecha_abono);
      if (archivo) data.append("comprobante", archivo);

      const res = await api.post(`/cuentas/${cuentaId}/abonos`, data);
      if (res.status === 200 || res.status === 201) {
        setShowSuccess(true);
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
    onRefreshTotals?.();
    onCancel();
  };

  /* --------------------------------------------------
   * 7. UI
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
                      type="text"
                      name="monto_abonado"
                      value={montoTexto}
                      onKeyDown={handleKeyDownMonto}
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
                          value={
                            form.tasa_cambio
                              ? Number(form.tasa_cambio).toLocaleString(
                                  "es-VE",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )
                              : ""
                          }
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
                      onChange={handleChange}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                  {form.metodo_pago === "TRANSFERENCIA" && (
                    <div>
                      <label className="block text-sm text-white">
                        Comprobante{" "}
                        <span className="text-red-400">(Obligatorio)</span>
                      </label>

                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="file"
                          name="comprobante"
                          accept="application/pdf,image/*"
                          onChange={handleFileChange}
                          required
                          className="block w-full text-sm text-gray-200
                           file:mr-4 file:py-2 file:px-4 file:rounded
                           file:border-0 file:text-sm file:font-semibold
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
                  )}
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
