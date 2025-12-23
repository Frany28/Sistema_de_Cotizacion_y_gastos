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
import axios from "axios";
import ModalElegirOrdenDePago from "./ModalElegirOrdenDePago";

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

  // Regla: ver órdenes si pagada o parcialmente pagada
  const puedeVerOrdenesPago = isPagada || isParcialmentePagada;

  const apiBaseUrl = import.meta.env.VITE_API_URL;

  // =========================
  // Helpers
  // =========================
  const mostrarMonto = (valor) =>
    new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);

  const EstadoIcon = () => {
    if (isPagada) return <CheckCircle2 className="w-4 h-4 mr-1" />;
    if (isCancelada) return <AlertCircle className="w-4 h-4 mr-1" />;
    if (isParcialmentePagada) return <Clock className="w-4 h-4 mr-1" />;
    return <Clock className="w-4 h-4 mr-1" />;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-VE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // =========================
  // PDF directo (lógica vieja)
  // =========================
  const handleVerOrdenPagoPDF = () => {
    if (!isPagada) return; // seguridad extra
    window.open(`${apiBaseUrl}/solicitudes-pago/${solicitud.id}/pdf`, "_blank");
  };

  // =========================
  // Órdenes de pago (selector)
  // =========================
  const [mostrarModalOrdenesPago, setMostrarModalOrdenesPago] = useState(false);
  const [ordenesPago, setOrdenesPago] = useState([]);
  const [cargandoOrdenesPago, setCargandoOrdenesPago] = useState(false);
  const [errorOrdenesPago, setErrorOrdenesPago] = useState("");

  const configAxios = useMemo(
    () => ({
      withCredentials: true,
    }),
    []
  );

  useEffect(() => {
    if (!visible) return;
    setMostrarModalOrdenesPago(false);
    setOrdenesPago([]);
    setCargandoOrdenesPago(false);
    setErrorOrdenesPago("");
  }, [visible, solicitud?.id]);

  const obtenerOrdenesPago = async () => {
    if (!solicitud?.id) return;

    setCargandoOrdenesPago(true);
    setErrorOrdenesPago("");

    try {
      const url = `${apiBaseUrl}/solicitudes-pago/${solicitud.id}/ordenes-pago`;
      const { data } = await axios.get(url, configAxios);

      // Backend esperado: { ok: true, data: [...] }
      const lista = Array.isArray(data?.data) ? data.data : [];
      setOrdenesPago(lista);
    } catch (error) {
      const mensaje =
        error?.response?.data?.message ||
        error?.message ||
        "Error al obtener órdenes de pago";
      setErrorOrdenesPago(mensaje);
      setOrdenesPago([]);
    } finally {
      setCargandoOrdenesPago(false);
    }
  };

  const handleAbrirModalOrdenesPago = async () => {
    if (!puedeVerOrdenesPago) return;

    setMostrarModalOrdenesPago(true);

    // Si ya están cargadas, no repitas petición
    if (ordenesPago.length > 0) return;

    await obtenerOrdenesPago();
  };

  // =========================
  // UI: estado badge (mantiene diseño viejo + añade parcial)
  // =========================
  const claseEstado = () => {
    if (isPagada) return "bg-green-100 text-green-800";
    if (isCancelada) return "bg-red-100 text-red-800";
    if (isParcialmentePagada) return "bg-blue-100 text-blue-800";
    if (isPorPagar) return "bg-yellow-100 text-yellow-800";
    return "bg-yellow-100 text-yellow-800";
  };

  // =========================
  // Cálculos (para parcial también)
  // =========================
  const montoTotal = Number(solicitud?.monto_total) || 0;
  const montoPagado = Number(solicitud?.monto_pagado) || 0;
  const diferencia = montoTotal - montoPagado;

  // Mostrar "pagado" si pagada o parcialmente pagada
  const mostrarPagado = isPagada || isParcialmentePagada;

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
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-blue-400 mr-2" />
                  <h2 className="text-xl font-semibold text-white">
                    Solicitud #{solicitud.codigo}
                  </h2>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  Creada el {formatearFecha(solicitud.fecha_solicitud)}
                  {isPagada && (
                    <span className="ml-2">
                      | Pagada el {formatearFecha(solicitud.fecha_pago)}
                    </span>
                  )}
                </p>
              </div>

              <div
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${claseEstado()}`}
              >
                <EstadoIcon />
                <span className="capitalize">{solicitud.estado}</span>
              </div>
            </div>

            {/* Contenido principal en dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna izquierda - Información básica */}
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                    <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
                    Información Básica
                  </h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>
                      <span className="text-gray-400">Proveedor:</span>{" "}
                      <span className="font-medium">
                        {solicitud.proveedor_nombre || "N/A"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-400">Gasto asociado:</span>{" "}
                      <span className="font-medium">
                        {solicitud.gasto_codigo || "N/A"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-400">Moneda:</span>{" "}
                      <span className="font-medium">
                        {solicitud.moneda || "-"}
                      </span>
                    </p>
                    {isBolivares && (
                      <p>
                        <span className="text-gray-400">Tasa de cambio:</span>{" "}
                        <span className="font-medium">
                          {solicitud.tasa_cambio || "-"} BS
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Detalles del pago: antes era solo pagada.
                    Ahora lo mantenemos, pero también lo mostramos en parcial si ya hay datos. */}
                {(isPagada || isParcialmentePagada) && (
                  <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                    <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                      <span className="w-3 h-3 bg-purple-400 rounded-full mr-2"></span>
                      Detalles del Pago
                    </h3>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>
                        <span className="text-gray-400">Método de pago:</span>{" "}
                        <span className="font-medium">
                          {solicitud.metodo_pago || "-"}
                        </span>
                      </p>
                      {solicitud.banco_id && (
                        <p>
                          <span className="text-gray-400">Banco:</span>{" "}
                          <span className="font-medium">
                            {solicitud.banco_nombre || "-"}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-gray-400">Referencia:</span>{" "}
                        <span className="font-medium">
                          {solicitud.referencia_pago || "-"}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Motivo de cancelación */}
                {isCancelada && (
                  <div className="bg-red-900/30 p-4 rounded-lg border border-red-700">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-red-300 mb-1">
                          Motivo de cancelación
                        </h4>
                        <span className="text-red-400 italic">
                          {solicitud.observaciones || "Sin motivo especificado"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Columna central - Detalles adicionales y montos */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                    <span className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></span>
                    Detalles Adicionales
                  </h3>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>
                      <p className="text-gray-400">Solicitado por:</p>
                      <p className="font-medium">
                        {solicitud.usuario_solicita_nombre || "-"}
                      </p>
                    </div>

                    {/* Antes era solo pagada; lo mantenemos (puedes habilitar en parcial si tu backend lo llena). */}
                    {isPagada && (
                      <div>
                        <p className="text-gray-400">Aprobado por:</p>
                        <p className="font-medium">
                          {solicitud.usuario_aprueba_nombre || "-"}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-400">Observaciones:</p>
                      <p className="font-medium">
                        {solicitud.observaciones || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla de montos */}
                <div className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                  <table className="w-full text-sm text-gray-300">
                    <thead className="bg-gray-600">
                      <tr className="text-left font-medium border-b border-gray-500">
                        <th className="p-3">Concepto</th>
                        {isBolivares && <th className="p-3">Tasa</th>}
                        <th className="p-3 text-right">Monto Solicitado</th>
                        <th className="p-3 text-right">Monto Pagado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-600 last:border-0">
                        {/* FIX: antes tenías un <div> dentro de <tr>. Debe ser <td>. */}
                        <td className="p-3 font-medium">
                          {solicitud.concepto_pago || solicitud.concepto || "-"}
                        </td>

                        {isBolivares && (
                          <td className="p-3">
                            {solicitud.tasa_cambio || "N/A"} BS
                          </td>
                        )}

                        <td className="p-3 text-right font-medium">
                          {isBolivares
                            ? `${mostrarMonto(montoTotal)} BS`
                            : `$${mostrarMonto(montoTotal)}`}
                        </td>

                        <td className="p-3 text-right font-medium text-blue-400">
                          {mostrarPagado
                            ? isBolivares
                              ? `${mostrarMonto(montoPagado)} BS`
                              : `$${mostrarMonto(montoPagado)}`
                            : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Resumen */}
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-gray-300">
                      <div className="flex justify-between text-sm">
                        <span>Monto solicitado:</span>
                        <span className="font-medium">
                          {isBolivares
                            ? `${mostrarMonto(montoTotal)} BS`
                            : `$${mostrarMonto(montoTotal)}`}
                        </span>
                      </div>

                      {mostrarPagado && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Monto pagado:</span>
                            <span className="font-medium text-green-400">
                              {isBolivares
                                ? `${mostrarMonto(montoPagado)} BS`
                                : `$${mostrarMonto(montoPagado)}`}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-gray-600 flex justify-between text-sm">
                            <span>Diferencia:</span>
                            <span
                              className={`font-medium ${
                                Number(diferencia) === 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {isBolivares
                                ? `${mostrarMonto(diferencia)} BS`
                                : `$${mostrarMonto(diferencia)}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (mantiene diseño viejo + agrega órdenes pago) */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium mr-2"
                type="button"
              >
                Cerrar
              </button>

              {/* Botón viejo: PDF directo (solo pagada) */}
              {isPagada && (
                <button
                  onClick={handleVerOrdenPagoPDF}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center mr-2"
                  type="button"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Orden de Pago.
                </button>
              )}

              {/* Botón nuevo: selector (pagada + parcialmente pagada) */}
              {puedeVerOrdenesPago && (
                <button
                  onClick={handleAbrirModalOrdenesPago}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center ${
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

      {/* Modal selector */}
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
