// ModalVerSolicitudDePago.jsx
// -----------------------------------------------------------------------------
// Modal para visualizar en modo lectura el detalle de una Solicitud de Pago.
// Mantiene estética oscura, utiliza Tailwind y framer‑motion para animaciones.
// Todas las variables y funciones están nombradas en camelCase y en español.
// -----------------------------------------------------------------------------

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";
import api from "../../api/index"; // ajusta esta ruta a tu helper de Axios si es necesario

export default function ModalVerSolicitudDePago({
  visible,
  solicitudId,
  onClose,
}) {
  /* ------------------------------------------------------------------------- */
  /*                           Estado local / helpers                          */
  /* ------------------------------------------------------------------------- */
  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(false);

  const formatearFecha = (fechaIso) =>
    fechaIso
      ? new Date(fechaIso).toLocaleDateString("es-VE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-";

  const formatearMonto = (valor) => {
    const numero = Number(valor);
    return isNaN(numero) ? "0,00" : numero.toFixed(2);
  };

  /* ------------------------------------------------------------------------- */
  /*                             Petición al backend                           */
  /* ------------------------------------------------------------------------- */
  useEffect(() => {
    if (!visible || !solicitudId) return;

    const controller = new AbortController();
    const obtenerDetalle = async () => {
      try {
        setCargando(true);
        const { data } = await api.get(`/solicitudes-pago/${solicitudId}`, {
          withCredentials: true,
          signal: controller.signal,
        });
        setSolicitud(data);
        setError("");
      } catch (e) {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        console.error(e);
        setError("No se pudo obtener la solicitud.");
      } finally {
        setCargando(false);
      }
    };

    obtenerDetalle();
    return () => controller.abort();
  }, [visible, solicitudId]);

  /* ------------------------------------------------------------------------- */
  /*                             Funciones de UI                               */
  /* ------------------------------------------------------------------------- */
  const handleCerrar = () => {
    setSolicitud(null);
    setError("");
    onClose();
  };

  const handleDescargarComprobante = () => {
    if (!solicitud?.comprobante_url) return;
    setDescargando(true);
    window.open(solicitud.comprobante_url, "_blank");
    setTimeout(() => setDescargando(false), 500);
  };

  const EstadoIcono = () => {
    if (solicitud?.estado === "pagada")
      return <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />;
    if (solicitud?.estado === "cancelada")
      return <AlertCircle className="w-4 h-4 text-red-500 mr-1" />;
    return <Clock className="w-4 h-4 text-yellow-400 mr-1" />;
  };

  /* ------------------------------------------------------------------------- */
  /*                             Short‑circuit Renders                         */
  /* ------------------------------------------------------------------------- */
  if (!visible) return null;

  const Wrapper = ({ children }) => (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        onClick={handleCerrar}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-5xl p-6 bg-gray-800 rounded-lg shadow text-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          {/* Botón de cierre */}
          <button
            onClick={handleCerrar}
            className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  /* ------------------------------------------------------------------------- */
  /*                                Loading / Error                            */
  /* ------------------------------------------------------------------------- */
  if (cargando)
    return (
      <Wrapper>
        <p className="text-center">Cargando solicitud…</p>
      </Wrapper>
    );

  if (error)
    return (
      <Wrapper>
        <p className="text-center text-red-400">{error}</p>
      </Wrapper>
    );

  if (!solicitud) return null; // fallback

  /* ------------------------------------------------------------------------- */
  /*                              Render principal                             */
  /* ------------------------------------------------------------------------- */
  return (
    <Wrapper>
      {/* Cabecera */}
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <EstadoIcono /> Solicitud&nbsp;{solicitud.codigo}
      </h2>

      {/* Información básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <p>
          <span className="font-medium">Fecha:</span>{" "}
          {formatearFecha(solicitud.fecha_solicitud)}
        </p>
        <p>
          <span className="font-medium">Proveedor:</span>{" "}
          {solicitud.proveedor_nombre || "Operativo"}
        </p>
        <p>
          <span className="font-medium">Moneda:</span> {solicitud.moneda}
        </p>
        <p>
          <span className="font-medium">Monto Total:</span>{" "}
          {formatearMonto(solicitud.monto_total)}
        </p>
        <p>
          <span className="font-medium">Monto Pagado:</span>{" "}
          {formatearMonto(solicitud.monto_pagado)}
        </p>
        <p>
          <span className="font-medium">Estado:</span> {solicitud.estado}
        </p>
        {solicitud.observaciones && (
          <p className="md:col-span-2 whitespace-pre-line">
            <span className="font-medium">Observaciones:</span>{" "}
            {solicitud.observaciones}
          </p>
        )}
      </div>

      {/* Acción: descargar comprobante */}
      {solicitud.comprobante_url && (
        <button
          onClick={handleDescargarComprobante}
          disabled={descargando}
          className="mt-6 inline-flex items-center px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
        >
          <Download className="w-4 h-4 mr-2" />
          {descargando ? "Descargando…" : "Descargar comprobante"}
        </button>
      )}
    </Wrapper>
  );
}
