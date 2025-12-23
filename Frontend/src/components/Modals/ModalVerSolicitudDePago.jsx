import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import {
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  List,
} from "lucide-react";
import ModalElegirOrdenPago from "./ModalElegirOrdenPago";

export default function ModalVerSolicitudDePago({
  visible,
  onClose,
  solicitud,
}) {
  if (!visible || !solicitud) return null;

  const isBolivares = solicitud.moneda === "VES";
  const isPagada = solicitud.estado === "pagada";
  const isCancelada = solicitud.estado === "cancelada";
  const isPorPagar = solicitud.estado === "por_pagar";
  const isParcialmentePagada = solicitud.estado === "parcialmente_pagada";

  const API = import.meta.env.VITE_API_URL;

  // ===== NUEVO: modal selector de ordenes =====
  const [mostrarModalOrdenesPago, setMostrarModalOrdenesPago] = useState(false);
  const [ordenesPago, setOrdenesPago] = useState([]);
  const [cargandoOrdenesPago, setCargandoOrdenesPago] = useState(false);
  const [errorOrdenesPago, setErrorOrdenesPago] = useState(null);

  const cargarOrdenesPago = async () => {
    try {
      setCargandoOrdenesPago(true);
      setErrorOrdenesPago(null);

      // Endpoint recomendado:
      // GET /solicitudes-pago/:id/ordenes-pago
      const respuesta = await fetch(
        `${API}/solicitudes-pago/${solicitud.id}/ordenes-pago`,
        { credentials: "include" }
      );

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        throw new Error(data?.message || "No se pudieron cargar las órdenes.");
      }

      const data = await respuesta.json();
      setOrdenesPago(Array.isArray(data) ? data : []);
    } catch (error) {
      setOrdenesPago([]);
      setErrorOrdenesPago(
        error?.message || "No se pudieron cargar las órdenes de pago."
      );
    } finally {
      setCargandoOrdenesPago(false);
    }
  };

  const handleVerOrdenPagoPDF = () => {
    // Esto es para el caso pagada (o si quieres forzar abrir el PDF “general”)
    window.open(`${API}/solicitudes-pago/${solicitud.id}/pdf`, "_blank");
  };

  const handleAbrirSelectorOrdenesPago = async () => {
    setMostrarModalOrdenesPago(true);
    await cargarOrdenesPago();
  };

  // ===== Icono de estado =====
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
                  <span className="ml-2 capitalize">
                    {String(solicitud.estado).replaceAll("_", " ")}
                  </span>
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

            {/* Contenido principal (ejemplo, respeta tu estructura actual si ya tenías más) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Monto Total</div>
                <div className="text-white text-lg font-semibold">
                  {isBolivares
                    ? `${formatearNumero(solicitud.monto_total)} Bs`
                    : `$${formatearNumero(solicitud.monto_total_usd)}`}
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Monto Pagado</div>
                <div className="text-white text-lg font-semibold">
                  {isBolivares
                    ? `${formatearNumero(solicitud.monto_pagado)} Bs`
                    : `$${formatearNumero(solicitud.monto_pagado_usd)}`}
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
                        Number(solicitud.monto_total_usd || 0) -
                          Number(solicitud.monto_pagado_usd || 0)
                      )}`}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm font-medium"
              >
                Cerrar
              </button>

              {/* Botón: Orden de pago (pagada => PDF directo) */}
              {isPagada && (
                <button
                  onClick={handleVerOrdenPagoPDF}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium flex items-center ml-2"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Orden de Pago
                </button>
              )}

              {/* NUEVO: parcialmente pagada => selector */}
              {isParcialmentePagada && (
                <button
                  onClick={handleAbrirSelectorOrdenesPago}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center ml-2"
                >
                  <List className="w-4 h-4 mr-2" />
                  Órdenes de pago
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      {/* NUEVO: Modal selector */}
      <ModalElegirOrdenPago
        visible={mostrarModalOrdenesPago}
        onClose={() => setMostrarModalOrdenesPago(false)}
        ordenesPago={ordenesPago}
        cargando={cargandoOrdenesPago}
        error={errorOrdenesPago}
        solicitud={solicitud}
      />
    </>
  );
}
