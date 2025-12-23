import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  List,
} from "lucide-react";
import ModalElegirOrdenDePago from "./ModalElegirOrdenDePago.jsx";

export default function ModalVerSolicitudDePago({
  visible,
  onClose,
  solicitud,
}) {
  if (!visible || !solicitud) return null;

  // =========================
  // Normalización de estado
  // =========================
  const estadoSolicitudNormalizado = String(solicitud?.estado || "")
    .toLowerCase()
    .trim();

  const isBolivares = String(solicitud?.moneda || "").toUpperCase() === "VES";

  const isPagada = estadoSolicitudNormalizado === "pagada";
  const isCancelada = estadoSolicitudNormalizado === "cancelada";
  const isPorPagar =
    estadoSolicitudNormalizado === "por_pagar" ||
    estadoSolicitudNormalizado === "por pagar";

  // Acepta variantes
  const isParcialmentePagada =
    estadoSolicitudNormalizado === "parcialmente_pagada" ||
    estadoSolicitudNormalizado === "parcialmente pagada" ||
    estadoSolicitudNormalizado === "parcial";

  // Regla de negocio: poder ver órdenes si está pagada o parcialmente pagada
  const puedeVerOrdenesPago = isPagada || isParcialmentePagada;

  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // =========================
  // Modal selector órdenes
  // =========================
  const [mostrarModalOrdenesPago, setMostrarModalOrdenesPago] = useState(false);
  const [ordenesPago, setOrdenesPago] = useState([]);
  const [cargandoOrdenesPago, setCargandoOrdenesPago] = useState(false);
  const [errorOrdenesPago, setErrorOrdenesPago] = useState(null);

  const configFetch = useMemo(
    () => ({
      credentials: "include",
    }),
    []
  );

  useEffect(() => {
    if (!visible) return;
    // Limpieza cuando abres/cambias solicitud
    setMostrarModalOrdenesPago(false);
    setOrdenesPago([]);
    setCargandoOrdenesPago(false);
    setErrorOrdenesPago(null);
  }, [visible, solicitud?.id]);

  const cargarOrdenesPago = async () => {
    try {
      setCargandoOrdenesPago(true);
      setErrorOrdenesPago(null);

      const respuesta = await fetch(
        `${apiBaseUrl}/solicitudes-pago/${solicitud.id}/ordenes-pago`,
        configFetch
      );

      const data = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(data?.message || "No se pudieron cargar las órdenes.");
      }

      // Tu backend devuelve: { ok: true, data: [...] }
      const listaOrdenes = Array.isArray(data?.data) ? data.data : [];
      setOrdenesPago(listaOrdenes);
    } catch (error) {
      setOrdenesPago([]);
      setErrorOrdenesPago(
        error?.message || "No se pudieron cargar las órdenes de pago."
      );
    } finally {
      setCargandoOrdenesPago(false);
    }
  };

  const handleAbrirSelectorOrdenesPago = async () => {
    if (!puedeVerOrdenesPago) return;

    setMostrarModalOrdenesPago(true);

    // Si ya están cargadas, no consultes otra vez
    if (ordenesPago.length > 0) return;

    await cargarOrdenesPago();
  };

  // =========================
  // PDF directo (lógica anterior)
  // =========================
  const handleVerOrdenPagoPdf = () => {
    // Mantiene tu lógica anterior: PDF “general” por solicitud
    window.open(`${apiBaseUrl}/solicitudes-pago/${solicitud.id}/pdf`, "_blank");
  };

  // =========================
  // UI helpers
  // =========================
  const EstadoIcon = () => {
    if (isPagada) return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (isParcialmentePagada)
      return <Clock className="w-5 h-5 text-blue-400" />;
    if (isCancelada) return <AlertCircle className="w-5 h-5 text-red-400" />;
    if (isPorPagar) return <Clock className="w-5 h-5 text-yellow-400" />;
    return <AlertCircle className="w-5 h-5 text-gray-400" />;
  };

  const badgeEstadoClass = () => {
    if (isPagada)
      return "bg-emerald-600/20 text-emerald-300 border-emerald-500/30";
    if (isParcialmentePagada)
      return "bg-blue-600/20 text-blue-300 border-blue-500/30";
    if (isPorPagar)
      return "bg-yellow-600/20 text-yellow-300 border-yellow-500/30";
    if (isCancelada) return "bg-red-600/20 text-red-300 border-red-500/30";
    return "bg-gray-600/20 text-gray-200 border-gray-500/30";
  };

  const formatearNumero = (valor) => {
    const numero = Number(valor || 0);
    return numero.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const textoEstado = String(solicitud?.estado || "").replaceAll("_", " ");

  // =========================
  // Render
  // =========================
  return (
    <>
      <AnimatePresence>
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
            className="relative w-full max-w-5xl p-6 bg-gray-800 rounded-lg shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-300 hover:text-white"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Encabezado */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-white text-xl font-semibold">
                  Solicitud de Pago:{" "}
                  <span className="text-emerald-400">{solicitud.codigo}</span>
                </h2>

                <div
                  className={`inline-flex items-center mt-2 px-3 py-1 rounded-full border text-sm ${badgeEstadoClass()}`}
                >
                  <EstadoIcon />
                  <span className="ml-2 capitalize">{textoEstado}</span>
                </div>
              </div>

              <div className="text-right text-gray-300 text-sm">
                <div>
                  <span className="text-gray-400">Fecha:</span>{" "}
                  {solicitud.fecha_solicitud || "—"}
                </div>
                <div>
                  <span className="text-gray-400">Moneda:</span>{" "}
                  {solicitud.moneda || "—"}
                </div>
              </div>
            </div>

            {/* Resumen montos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Monto Total</div>
                <div className="text-white text-lg font-semibold">
                  {isBolivares
                    ? `${formatearNumero(solicitud.monto_total)} Bs`
                    : `$${formatearNumero(
                        solicitud.monto_total_usd ?? solicitud.monto_total
                      )}`}
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Monto Pagado</div>
                <div className="text-white text-lg font-semibold">
                  {isBolivares
                    ? `${formatearNumero(solicitud.monto_pagado)} Bs`
                    : `$${formatearNumero(
                        solicitud.monto_pagado_usd ?? solicitud.monto_pagado
                      )}`}
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Saldo Pendiente</div>
                <div className="text-white text-lg font-semibold">
                  {isBolivares
                    ? `${formatearNumero(
                        Number(solicitud.monto_total || 0) -
                          Number(solicitud.monto_pagado || 0)
                      )} Bs`
                    : `$${formatearNumero(
                        Number(
                          solicitud.monto_total_usd ??
                            solicitud.monto_total ??
                            0
                        ) -
                          Number(
                            solicitud.monto_pagado_usd ??
                              solicitud.monto_pagado ??
                              0
                          )
                      )}`}
                </div>
              </div>
            </div>

            {/* Acciones (mantiene lógica anterior + agrega parcial) */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm font-medium"
                type="button"
              >
                Cerrar
              </button>

              {/* Lógica anterior: pagada => PDF directo */}
              {isPagada && (
                <button
                  onClick={handleVerOrdenPagoPdf}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium flex items-center"
                  type="button"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Orden de Pago
                </button>
              )}

              {/* Cambio nuevo: selector para pagada y parcialmente pagada */}
              {puedeVerOrdenesPago && (
                <button
                  onClick={handleAbrirSelectorOrdenesPago}
                  className={`px-4 py-2 text-white rounded text-sm font-medium flex items-center ${
                    isParcialmentePagada
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                  type="button"
                >
                  <List className="w-4 h-4 mr-2" />
                  Órdenes de pago
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal selector (sin comentarios // dentro de JSX) */}
      <ModalElegirOrdenDePago
        visible={mostrarModalOrdenesPago}
        onClose={() => setMostrarModalOrdenesPago(false)}
        ordenesPago={ordenesPago}
        cargando={cargandoOrdenesPago}
        error={errorOrdenesPago}
      />
    </>
  );
}
