// ModalRegistrarAbono.jsx
import { useState, useEffect } from "react";
import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Paperclip } from "lucide-react";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";

export default function ModalRegistrarAbono({
  cuentaId,
  usuarioId,
  alCancelar,
  alRefrescarTotales,
}) {
  // Estado del formulario con nombres en español y camelCase
  const [formulario, setFormulario] = useState({
    montoAbonado: "",
    monedaPago: "USD",
    tasaCambio: "",
    fechaAbono: new Date().toISOString().split("T")[0],
    observaciones: "",
  });
  const [archivo, setArchivo] = useState(null);
  const [saldoPendiente, setSaldoPendiente] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [montoEnUSD, setMontoEnUSD] = useState("");

  const [mostrarExito, setMostrarExito] = useState(false);
  const [mostrarError, setMostrarError] = useState(false);

  // Obtener saldo pendiente al cargar el modal
  useEffect(() => {
    if (!cuentaId) return;
    api
      .get(`/cuentas/${cuentaId}/saldo`)
      .then((res) => setSaldoPendiente(res.data.saldo))
      .catch(() => setMensajeError("No se pudo obtener el saldo pendiente."));
  }, [cuentaId]);

  // Obtener tasa de cambio si la moneda es VES
  useEffect(() => {
    if (formulario.monedaPago !== "VES") {
      setMontoEnUSD("");
      return;
    }
    api
      .get("https://ve.dolarapi.com/v1/dolares/oficial")
      .then((res) => {
        const promedio = res.data?.promedio;
        if (promedio)
          setFormulario((f) => ({ ...f, tasaCambio: promedio.toFixed(4) }));
      })
      .catch(() => setMensajeError("No se pudo obtener la tasa del día."));
  }, [formulario.monedaPago]);

  // Calcular equivalente en USD
  useEffect(() => {
    if (
      formulario.monedaPago === "VES" &&
      formulario.tasaCambio &&
      formulario.montoAbonado
    ) {
      setMontoEnUSD(
        (formulario.montoAbonado / formulario.tasaCambio).toFixed(2)
      );
    } else {
      setMontoEnUSD("");
    }
  }, [formulario.monedaPago, formulario.tasaCambio, formulario.montoAbonado]);

  // Manejador de cambios de inputs de texto y select
  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setFormulario({ ...formulario, [name]: value });
    setMensajeError("");
  };

  // Manejador de cambio de archivo
  const manejarCambioArchivo = (e) => {
    const file = e.target.files[0];
    if (file) setArchivo(file);
  };

  // Envío del formulario
  const manejarEnvio = async (e) => {
    e.preventDefault();
    setMensajeError("");

    const monto = parseFloat(formulario.montoAbonado);
    if (!monto || monto <= 0) {
      setMensajeError("Debe ingresar un monto válido.");
      return;
    }
    if (saldoPendiente != null && monto > saldoPendiente) {
      setMensajeError("El monto no puede superar el saldo pendiente.");
      return;
    }
    if (formulario.monedaPago === "VES" && !formulario.tasaCambio) {
      setMensajeError("No se pudo obtener la tasa del día.");
      return;
    }

    setEnviando(true);
    try {
      const datos = new FormData();
      datos.append("monto", monto);
      datos.append("moneda", formulario.monedaPago);
      datos.append(
        "tasa_cambio",
        formulario.monedaPago === "VES" ? parseFloat(formulario.tasaCambio) : 1
      );
      datos.append("fecha", formulario.fechaAbono);
      if (formulario.observaciones)
        datos.append("observaciones", formulario.observaciones);
      if (archivo) datos.append("comprobante", archivo);

      const respuesta = await api.post(`/cuentas/${cuentaId}/abonos`, datos, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (respuesta.status === 200 || respuesta.status === 201) {
        setMostrarExito(true);
      } else {
        setMostrarError(true);
      }
    } catch {
      setMostrarError(true);
    } finally {
      setEnviando(false);
    }
  };

  // Cerrar modales de resultado y refrescar totales si es éxito
  const manejarCerrarResultado = () => {
    if (mostrarExito) {
      alRefrescarTotales?.();
    }
    setMostrarExito(false);
    setMostrarError(false);
    alCancelar();
  };

  return (
    <AnimatePresence exitBeforeEnter>
      {mostrarExito && (
        <ModalExito
          key="exito"
          titulo="Abono registrado"
          mensaje="El abono fue procesado correctamente."
          textoBoton="Entendido"
          onClose={manejarCerrarResultado}
        />
      )}

      {mostrarError && (
        <ModalError
          key="error"
          titulo="Error"
          mensaje="No se pudo registrar el abono."
          textoBoton="Cerrar"
          onClose={manejarCerrarResultado}
        />
      )}

      {!mostrarExito && !mostrarError && (
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
                  onClick={alCancelar}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={manejarEnvio} className="space-y-4">
                {mensajeError && (
                  <p className="text-red-500 text-sm">{mensajeError}</p>
                )}

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
                      name="montoAbonado"
                      value={formulario.montoAbonado}
                      onChange={manejarCambio}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white">Moneda</label>
                    <select
                      name="monedaPago"
                      value={formulario.monedaPago}
                      onChange={manejarCambio}
                      className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600"
                    >
                      <option value="USD">USD</option>
                      <option value="VES">VES</option>
                    </select>
                  </div>
                  {formulario.monedaPago === "VES" && (
                    <>
                      <div>
                        <label className="block text-sm text-white">
                          Tasa de cambio
                        </label>
                        <input
                          type="text"
                          value={formulario.tasaCambio}
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
                          value={montoEnUSD}
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
                      name="fechaAbono"
                      value={formulario.fechaAbono}
                      onChange={manejarCambio}
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
                        onChange={manejarCambioArchivo}
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
                    value={formulario.observaciones}
                    onChange={manejarCambio}
                    className="w-full p-2 mt-1 rounded bg-gray-700 text-white border border-gray-600 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className={`w-full p-2 text-white rounded font-medium ${
                    enviando
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {enviando ? "Registrando..." : "Registrar Abono"}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
