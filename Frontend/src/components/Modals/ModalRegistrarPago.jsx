import React, { useState, useEffect, useRef, useMemo } from "react";
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

/** Formato LATAM (punto miles, coma decimales) */
const formatoLatam = (valor) => {
  const numero = Number(valor) || 0;
  return numero
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/** Convierte string LATAM a número: "1.234,56" -> 1234.56 */
const latamToNumero = (valorTexto) => {
  if (typeof valorTexto !== "string") return Number(valorTexto) || 0;
  const limpio = valorTexto.replace(/\./g, "").replace(",", ".");
  const numero = parseFloat(limpio);
  return Number.isFinite(numero) ? numero : 0;
};

/** Formato de escritura tipo "cajero" (opcional simple): deja solo números y , */
const limpiarInputLatam = (texto) => {
  if (!texto) return "";
  // deja dígitos y coma
  return texto.replace(/[^\d,]/g, "");
};

/** Redondeo seguro a 2 decimales */
const redondear2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function ModalRegistrarPago({
  visible,
  solicitudId,
  onClose,
  onPaid,
}) {
  const [detalle, setDetalle] = useState(null);
  const [banks, setBanks] = useState([]);
  const [firmaURL, setFirmaURL] = useState(null);

  // Tasa del día para VES (del endpoint)
  const [tasaDia, setTasaDia] = useState(null);
  const [cargandoTasa, setCargandoTasa] = useState(false);

  // OJO: monto_abono lo manejamos como texto LATAM para que escriba bonito
  const [form, setForm] = useState({
    metodo_pago: "",
    banco_id: "",
    referencia_pago: "",
    fecha_pago: "",
    comprobante: null,
    observaciones: "",
    monto_abono: "", // NUEVO
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalExito, setModalExito] = useState({ visible: false, mensaje: "" });
  const [modalError, setModalError] = useState({ visible: false, mensaje: "" });

  const fileInputRef = useRef(null);

  /** Precargar fecha actual al abrir */
  useEffect(() => {
    if (visible) {
      setForm((prev) => ({ ...prev, fecha_pago: nowLocalISO() }));
      setTasaDia(null);
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
          // Por defecto, que el abono sea el saldo pendiente (para facilitar)
          monto_abono: "",
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

  /** Traer tasa del día SOLO si la solicitud está en VES */
  useEffect(() => {
    if (!visible) return;
    if (!detalle) return;
    if (detalle.moneda !== "VES") return;

    (async () => {
      try {
        setCargandoTasa(true);
        // API: https://ve.dolarapi.com/v1/dolares/oficial
        const resp = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
        if (!resp.ok) throw new Error("No se pudo consultar la tasa del día.");

        const data = await resp.json();
        // La API normalmente trae "promedio" y/o "price". Usamos el primero disponible.
        const tasa =
          Number(data?.promedio) ||
          Number(data?.price) ||
          Number(data?.venta) ||
          Number(data?.compra) ||
          null;

        if (!tasa || tasa <= 0) {
          throw new Error("La tasa recibida no es válida.");
        }

        setTasaDia(tasa);
      } catch (e) {
        console.error("Error al obtener tasa:", e);
        setTasaDia(null);
        setModalError({
          visible: true,
          mensaje:
            e.message ||
            "No se pudo obtener la tasa del día. Intente nuevamente.",
        });
      } finally {
        setCargandoTasa(false);
      }
    })();
  }, [visible, detalle]);

  /** Datos derivados */
  const montoTotal = useMemo(
    () => Number(detalle?.monto_total) || 0,
    [detalle]
  );
  const montoPagado = useMemo(
    () => Number(detalle?.monto_pagado) || 0,
    [detalle]
  );
  const saldoPendiente = useMemo(
    () => redondear2(montoTotal - montoPagado),
    [montoTotal, montoPagado]
  );

  const simboloMoneda =
    detalle?.moneda === "VES" ? "Bs" : detalle?.moneda || "USD";

  const montoAbonoNumero = useMemo(
    () => latamToNumero(form.monto_abono),
    [form.monto_abono]
  );

  const saldoTexto = detalle
    ? `${formatoLatam(saldoPendiente)} ${simboloMoneda}`
    : "0,00 Bs";

  const abonoTexto = `${formatoLatam(montoAbonoNumero)} ${simboloMoneda}`;

  const abonoUsdEstimado = useMemo(() => {
    if (!detalle) return 0;
    if (detalle.moneda === "USD") return montoAbonoNumero;
    if (detalle.moneda === "VES" && tasaDia) return montoAbonoNumero / tasaDia;
    return 0;
  }, [detalle, montoAbonoNumero, tasaDia]);

  /** Manejo de cambios */
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    // Archivos
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
      return;
    }

    // Monto abono (texto LATAM)
    if (name === "monto_abono") {
      const limpio = limpiarInputLatam(value);
      setForm((prev) => ({ ...prev, monto_abono: limpio }));
      return;
    }

    const newForm = { ...form, [name]: value };

    if (name === "metodo_pago" && value === "Efectivo") {
      newForm.banco_id = "";
      newForm.comprobante = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    setForm(newForm);
  };

  /** Enviar abono */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!detalle) throw new Error("No hay detalle de la solicitud.");

      // Validaciones de abono
      if (!montoAbonoNumero || montoAbonoNumero <= 0) {
        throw new Error("Debe indicar un monto de abono mayor a 0.");
      }
      if (montoAbonoNumero > saldoPendiente + 0.0001) {
        throw new Error("El abono no puede ser mayor al saldo pendiente.");
      }

      // Si es VES, la tasa del día es obligatoria
      if (detalle.moneda === "VES") {
        if (!tasaDia || tasaDia <= 0) {
          throw new Error(
            "No se pudo obtener la tasa del día. No es posible registrar el abono."
          );
        }
      }

      const fechaPago = form.fecha_pago || nowLocalISO();

      const formData = new FormData();
      formData.append("metodo_pago", form.metodo_pago);

      // NUEVO: monto_abono (snake_case como espera el backend)
      formData.append("monto_abono", String(montoAbonoNumero));

      // NUEVO: tasa_cambio_abono (solo si VES)
      if (detalle.moneda === "VES") {
        formData.append("tasa_cambio_abono", String(tasaDia));
      }

      if (form.metodo_pago !== "Efectivo") {
        formData.append("banco_id", form.banco_id);
        formData.append("referencia_pago", form.referencia_pago);

        if (!form.comprobante) {
          throw new Error("Debe adjuntar el comprobante de pago.");
        }
        formData.append("comprobante", form.comprobante, form.comprobante.name);
      } else {
        // Si quieres que efectivo también lleve referencia tipo recibo, lo dejamos permitido
        if (form.referencia_pago) {
          formData.append("referencia_pago", form.referencia_pago);
        }
      }

      formData.append("fecha_pago", fechaPago);
      formData.append("observaciones", form.observaciones);

      const url = `/solicitudes-pago/${solicitudId}/pagar`;
      const { data } = await api.patch(url, formData, {
        withCredentials: true,
      });

      setModalExito({ visible: true, mensaje: data.message });
    } catch (err) {
      console.error("Error al registrar abono:", err);
      setModalError({
        visible: true,
        mensaje:
          err.response?.data?.message ||
          err.message ||
          "No se pudo registrar el abono. Intente nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
                className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-4">
                <CreditCard className="mx-auto mb-2 text-blue-600 w-10 h-10" />
                <h3 className="text-1xl font-semibold text-white">
                  Registrar Abono
                </h3>
                {detalle && (
                  <p className="text-xs text-gray-400 mt-1">
                    Estado actual:{" "}
                    <span className="text-gray-200">{detalle.estado}</span>
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                {/* Saldo pendiente */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Saldo pendiente
                  </label>
                  <input
                    type="text"
                    value={saldoTexto}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none"
                  />
                </div>

                {/* Monto abono */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Monto del abono
                  </label>
                  <input
                    type="text"
                    name="monto_abono"
                    value={form.monto_abono}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Ej: 100,00"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
                    focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Abono: <span className="text-gray-200">{abonoTexto}</span>
                  </p>
                </div>

                {/* Tasa del día (solo VES) */}
                {detalle?.moneda === "VES" && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Tasa del día (USD oficial)
                    </label>
                    <input
                      type="text"
                      value={
                        cargandoTasa
                          ? "Consultando..."
                          : tasaDia
                          ? formatoLatam(tasaDia)
                          : "—"
                      }
                      readOnly
                      className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Abono estimado en USD:{" "}
                      <span className="text-gray-200">
                        {formatoLatam(abonoUsdEstimado)} USD
                      </span>
                    </p>
                  </div>
                )}

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
                    className="cursor-pointer w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm
                    focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
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
                        required
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
                      required
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
                      className="border border-gray-300 rounded w-[300px] h-[120px] object-contain bg-white"
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
                    disabled={
                      isSubmitting || (detalle?.moneda === "VES" && !tasaDia)
                    }
                    className="cursor-pointer px-5 py-2 text-sm font-medium 
                    text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    title={
                      detalle?.moneda === "VES" && !tasaDia
                        ? "No se puede registrar sin tasa del día"
                        : ""
                    }
                  >
                    {isSubmitting ? "Registrando..." : "Registrar Abono"}
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
        titulo="Abono Registrado"
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
