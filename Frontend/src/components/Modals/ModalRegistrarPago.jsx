import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CreditCard, RefreshCw } from "lucide-react";
import api from "../../api/index";
import ModalExito from "./ModalExito";
import ModalError from "./ModalError";

api.defaults.baseURL = import.meta.env.VITE_API_URL;

const nowLocalISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const formatoLatam = (valor) => {
  const numero = Number(valor) || 0;
  return numero
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const redondear2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Estilo banco / cajero:
 * - Guardamos internamente "centavos" como string de dígitos: "1234" => 12,34
 * - Mostramos siempre con 2 decimales y formato LATAM.
 */
const soloDigitos = (texto) => (texto || "").replace(/\D/g, "");

const centavosTextoAFloat = (centavosTexto) => {
  const digitos = soloDigitos(centavosTexto);
  if (!digitos) return 0;
  return Number(digitos) / 100;
};

const formatearBancoDesdeCentavosTexto = (centavosTexto) => {
  const valor = centavosTextoAFloat(centavosTexto);
  return formatoLatam(valor);
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

  const [tasaDia, setTasaDia] = useState(null);
  const [cargandoTasa, setCargandoTasa] = useState(false);

  const [form, setForm] = useState({
    metodo_pago: "",
    banco_id: "",
    referencia_pago: "",
    fecha_pago: "",
    comprobante: null,
    observaciones: "",
    montoAbonoCentavosTexto: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalExito, setModalExito] = useState({ visible: false, mensaje: "" });
  const [modalError, setModalError] = useState({ visible: false, mensaje: "" });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    setForm((prev) => ({
      ...prev,
      fecha_pago: nowLocalISO(),
      comprobante: null,
      referencia_pago: "",
      observaciones: "",
      metodo_pago: "",
      banco_id: "",
      montoAbonoCentavosTexto: "",
    }));
    setTasaDia(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [visible]);

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
        } else {
          setFirmaURL(null);
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

  const consultarTasaDelDia = async () => {
    try {
      setCargandoTasa(true);

      const resp = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (!resp.ok) throw new Error("No se pudo consultar la tasa del día.");

      const data = await resp.json();

      const tasa =
        Number(data?.promedio) ||
        Number(data?.price) ||
        Number(data?.venta) ||
        Number(data?.compra) ||
        null;

      if (!tasa || tasa <= 0) throw new Error("La tasa recibida no es válida.");

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
  };

  useEffect(() => {
    if (!visible) return;
    if (!detalle) return;
    if (detalle.moneda !== "VES") return;

    consultarTasaDelDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, detalle]);

  /** =========================
   *  SALDOS (USD base + VES actualizado)
   *  ========================= */

  const montoTotalUsd = useMemo(
    () => Number(detalle?.monto_total_usd) || 0,
    [detalle]
  );

  // Si el backend te da monto_pagado_usd, usamos eso. Si no, aproximamos:
  const montoPagadoUsd = useMemo(() => {
    if (!detalle) return 0;

    const pagadoUsdDirecto = Number(detalle?.monto_pagado_usd);
    if (Number.isFinite(pagadoUsdDirecto) && pagadoUsdDirecto >= 0) {
      return pagadoUsdDirecto;
    }

    // aproximación: monto_pagado (VES) / tasa_cambio (guardada en solicitud)
    if (detalle.moneda === "VES") {
      const pagadoVes = Number(detalle?.monto_pagado) || 0;
      const tasaSolicitud = Number(detalle?.tasa_cambio) || 0;
      if (tasaSolicitud > 0) return pagadoVes / tasaSolicitud;
    }

    return 0;
  }, [detalle]);

  const saldoUsdPendiente = useMemo(() => {
    if (!detalle) return 0;
    const saldo = montoTotalUsd - montoPagadoUsd;
    return saldo > 0 ? saldo : 0;
  }, [detalle, montoTotalUsd, montoPagadoUsd]);

  // Este es el saldo “real” en VES recalculado con tasa del día
  const saldoVesActualizado = useMemo(() => {
    if (!detalle) return 0;
    if (detalle.moneda !== "VES") return 0;
    if (!tasaDia || tasaDia <= 0) return 0;
    return saldoUsdPendiente * tasaDia;
  }, [detalle, saldoUsdPendiente, tasaDia]);

  // Para USD, el saldo pendiente se muestra normal en USD
  const saldoUsdTexto = useMemo(() => {
    if (!detalle) return "0,00 USD";
    return `${formatoLatam(saldoUsdPendiente)} USD`;
  }, [detalle, saldoUsdPendiente]);

  const simboloMoneda =
    detalle?.moneda === "VES" ? "Bs" : detalle?.moneda || "USD";

  // Si es VES: mostramos el saldo en VES usando tasa del día. Si no: el saldo en USD.
  const saldoTextoPrincipal = useMemo(() => {
    if (!detalle) return `0,00 ${simboloMoneda}`;

    if (detalle.moneda === "VES") {
      // Si todavía no hay tasa, no inventamos saldo actualizado
      if (!tasaDia) return `— Bs`;
      return `${formatoLatam(saldoVesActualizado)} Bs`;
    }

    return `${formatoLatam(saldoUsdPendiente)} USD`;
  }, [detalle, simboloMoneda, tasaDia, saldoVesActualizado, saldoUsdPendiente]);

  /** =========================
   *  ABONO (estilo banco)
   *  ========================= */
  const montoAbonoNumero = useMemo(
    () => centavosTextoAFloat(form.montoAbonoCentavosTexto),
    [form.montoAbonoCentavosTexto]
  );

  const montoAbonoTexto = useMemo(
    () => formatearBancoDesdeCentavosTexto(form.montoAbonoCentavosTexto),
    [form.montoAbonoCentavosTexto]
  );

  // Abono estimado en USD (si VES, usando tasa del día)
  const abonoUsdEstimado = useMemo(() => {
    if (!detalle) return 0;
    if (detalle.moneda === "USD") return montoAbonoNumero;
    if (detalle.moneda === "VES" && tasaDia) return montoAbonoNumero / tasaDia;
    return 0;
  }, [detalle, montoAbonoNumero, tasaDia]);

  // Límite máximo del abono:
  // - Si es VES: saldo actualizado en VES (tasa del día)
  // - Si es USD: saldo en USD
  const maximoAbonoMoneda = useMemo(() => {
    if (!detalle) return 0;
    if (detalle.moneda === "VES") return saldoVesActualizado || 0;
    return saldoUsdPendiente || 0;
  }, [detalle, saldoVesActualizado, saldoUsdPendiente]);

  const maximoTexto = useMemo(() => {
    if (!detalle) return "0,00";
    if (detalle.moneda === "VES")
      return `${formatoLatam(maximoAbonoMoneda)} Bs`;
    return `${formatoLatam(maximoAbonoMoneda)} USD`;
  }, [detalle, maximoAbonoMoneda]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
      return;
    }

    if (name === "monto_abono") {
      const digitos = soloDigitos(value).slice(0, 18);
      setForm((prev) => ({ ...prev, montoAbonoCentavosTexto: digitos }));
      return;
    }

    const nuevoForm = { ...form, [name]: value };

    if (name === "metodo_pago" && value === "Efectivo") {
      nuevoForm.banco_id = "";
      nuevoForm.comprobante = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    setForm(nuevoForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!detalle) throw new Error("No hay detalle de la solicitud.");

      if (!montoAbonoNumero || montoAbonoNumero <= 0) {
        throw new Error("Debe indicar un monto de abono mayor a 0.");
      }

      // ✅ Validamos contra el saldo ACTUALIZADO si es VES
      if (montoAbonoNumero > maximoAbonoMoneda + 0.0001) {
        throw new Error("El abono no puede ser mayor al saldo pendiente.");
      }

      if (detalle.moneda === "VES") {
        if (!tasaDia || tasaDia <= 0) {
          throw new Error(
            "No se pudo obtener la tasa del día. No es posible registrar el abono."
          );
        }
      }

      if (!form.metodo_pago) {
        throw new Error("Debe seleccionar método de pago.");
      }

      const metodoNormalizado = String(form.metodo_pago).trim();

      if (metodoNormalizado !== "Efectivo") {
        if (!form.banco_id) throw new Error("Debe seleccionar banco.");
        if (!form.referencia_pago)
          throw new Error("Debe ingresar referencia de pago.");
        if (!form.comprobante)
          throw new Error("Debe adjuntar el comprobante de pago.");
      }

      const fechaPago = form.fecha_pago || nowLocalISO();

      const formData = new FormData();
      formData.append("metodo_pago", metodoNormalizado);

      // backend espera esto:
      formData.append("monto_abono", String(montoAbonoNumero));

      if (detalle.moneda === "VES") {
        formData.append("tasa_cambio_abono", String(tasaDia));
      }

      if (metodoNormalizado !== "Efectivo") {
        formData.append("banco_id", form.banco_id);
        formData.append("referencia_pago", form.referencia_pago);
        formData.append("comprobante", form.comprobante, form.comprobante.name);
      } else {
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
                {detalle?.moneda === "VES" && tasaDia && (
                  <div className="col-span-2 mt-2">
                    <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-600/40 bg-yellow-500/10">
                      <span className="text-yellow-400 text-sm">⚠</span>
                      <p className="text-xs text-yellow-100 leading-relaxed">
                        El saldo en Bs se recalcula con la{" "}
                        <b>tasa oficial del día</b>. Si la tasa cambia,{" "}
                        <b>el saldo pendiente en Bs</b> también cambia.
                      </p>
                    </div>
                  </div>
                )}

                {/* Saldo pendiente (VES actualizado a tasa del día / USD base) */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Saldo pendiente
                  </label>
                  <input
                    type="text"
                    value={saldoTextoPrincipal}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none"
                  />

                  {/* Siempre mostramos el saldo base en USD (siempre estable) */}
                  <p className="text-xs text-gray-400 mt-1">
                    Base en USD:{" "}
                    <span className="text-gray-200">{saldoUsdTexto}</span>
                  </p>
                </div>

                {/* Monto a abonar */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Monto a abonar
                  </label>
                  <input
                    type="text"
                    name="monto_abono"
                    value={montoAbonoTexto}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="0,00"
                    inputMode="numeric"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm 
                    focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Máximo: <span className="text-gray-200">{maximoTexto}</span>
                    {detalle?.moneda === "VES" && tasaDia && (
                      <>
                        {" "}
                        · USD estimado:{" "}
                        <span className="text-gray-200">
                          {formatoLatam(abonoUsdEstimado)} USD
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Tasa del día */}
                {detalle?.moneda === "VES" && (
                  <div className="col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Tasa del día (USD oficial)
                      </label>

                      <button
                        type="button"
                        onClick={consultarTasaDelDia}
                        disabled={cargandoTasa || isSubmitting}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white disabled:opacity-50"
                        title="Actualizar tasa"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                      </button>
                    </div>

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
                  </div>
                )}

                {/* Método */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Método de pago
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
                    <option value="">Seleccionar...</option>
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
                  </div>
                )}

                {/* Referencia */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Referencia de pago
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
                    Fecha de pago
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
                    {isSubmitting ? "Registrando..." : "Registrar abono"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalExito
        visible={modalExito.visible}
        onClose={() => {
          setModalExito({ visible: false, mensaje: "" });
          onPaid();
          onClose();
        }}
        titulo="Abono registrado"
        mensaje={modalExito.mensaje}
      />

      <ModalError
        visible={modalError.visible}
        onClose={() => setModalError({ visible: false, mensaje: "" })}
        titulo="Error"
        mensaje={modalError.mensaje}
      />
    </>
  );
}
