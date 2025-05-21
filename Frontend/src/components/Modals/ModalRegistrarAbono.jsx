import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign } from "lucide-react";

export default function ModalRegistrarAbono({
  cuentaId,
  usuarioId,
  onCancel,
  onSuccess,
  onError,
}) {
  const [form, setForm] = useState({
    monto_abonado: "",
    moneda_pago: "USD",
    tasa_cambio: "",
    fecha_abono: new Date().toISOString().split("T")[0],
    observaciones: "",
  });

  const [cargandoTasa, setCargandoTasa] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [montoUSD, setMontoUSD] = useState("");

  useEffect(() => {
    const obtenerTasa = async () => {
      if (form.moneda_pago === "VES") {
        try {
          setCargandoTasa(true);
          const res = await axios.get(
            "https://ve.dolarapi.com/v1/dolares/oficial"
          );
          const tasa = res.data?.promedio;
          if (tasa)
            setForm((prev) => ({ ...prev, tasa_cambio: tasa.toFixed(4) }));
        } catch (err) {
          console.error("Error al obtener tasa:", err);
          setError("No se pudo obtener la tasa del día");
        } finally {
          setCargandoTasa(false);
        }
      } else {
        setForm((prev) => ({ ...prev, tasa_cambio: "" }));
        setMontoUSD("");
      }
    };
    obtenerTasa();
  }, [form.moneda_pago]);

  useEffect(() => {
    if (form.moneda_pago === "VES" && form.tasa_cambio && form.monto_abonado) {
      const usd = parseFloat(form.monto_abonado / form.tasa_cambio).toFixed(2);
      setMontoUSD(usd);
    } else {
      setMontoUSD("");
    }
  }, [form.monto_abonado, form.tasa_cambio, form.moneda_pago]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.monto_abonado || parseFloat(form.monto_abonado) <= 0) {
      setError("Debe ingresar un monto válido");
      return;
    }
    if (form.moneda_pago === "VES" && !form.tasa_cambio) {
      setError("No se pudo obtener la tasa del día. Intente de nuevo.");
      return;
    }

    try {
      setIsSubmitting(true);
      const abonoData = {
        cuenta_id: cuentaId,
        usuario_id: usuarioId,
        monto_abonado: parseFloat(form.monto_abonado),
        moneda_pago: form.moneda_pago,
        tasa_cambio:
          form.moneda_pago === "VES" ? parseFloat(form.tasa_cambio) : 1,
        fecha_abono: form.fecha_abono,
        observaciones: form.observaciones,
      };

      const res = await axios.post(
        "http://localhost:3000/api/abonos",
        abonoData
      );
      if (res.status === 200) {
        onSuccess({
          titulo: "Abono registrado",
          mensaje: "El abono fue procesado correctamente",
          textoBoton: "Entendido",
        });
        onCancel();
      }
    } catch (err) {
      console.error("Error al registrar abono:", err);
      onError({
        titulo: "Error",
        mensaje: "No se pudo registrar el abono",
        textoBoton: "Cerrar",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
      >
        <div className="relative p-4 w-full max-w-2xl">
          <div className="bg-gray-800 rounded-lg shadow-md p-4 w-125">
            <div className="flex flex-col items-center">
              <DollarSign className="w-8 h-8 text-green-500 mb-2" />
              <h3 className="text-lg font-semibold  text-white mb-4">
                Registrar Abono
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-43 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white">Monto</label>
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
                  <label className="text-sm text-white">Moneda</label>
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
              </div>

              {form.moneda_pago === "VES" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white">
                      Tasa de cambio (VES/1 USD)
                    </label>
                    <input
                      type="text"
                      name="tasa_cambio"
                      value={form.tasa_cambio?.toString() || ""}
                      readOnly
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white">
                      Equivalente en USD
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={montoUSD}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white">Fecha del abono</label>
                  <input
                    type="date"
                    name="fecha_abono"
                    value={form.fecha_abono}
                    onChange={handleChange}
                    className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-white">Observaciones</label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600 resize-none min-h-[3rem]"
                  placeholder="Escriba una observación..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full p-2 text-white rounded font-medium ${
                  isSubmitting
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-700"
                }`}
              >
                {isSubmitting ? "Registrando..." : "Registrar Abono"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
