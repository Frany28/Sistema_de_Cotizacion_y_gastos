// ModalVerSolicitudDePago.jsx
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
import api from "../../api/index"; // ← ajusta la ruta a tu helper de Axios

export default function ModalVerSolicitudDePago({
  visible,
  solicitudId,
  onClose,
}) {
  /* ------------------------ estado local ------------------------- */
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(false);

  /* ------------------ efecto: traer el detalle ------------------- */
  useEffect(() => {
    if (!visible || !solicitudId) return;

    let cancel; // para cancelar si el componente se desmonta
    const fetchDetalle = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/solicitudes-pago/${solicitudId}`, {
          cancelToken: new api.CancelToken((c) => (cancel = c)),
        });
        setSolicitud(data);
        setError("");
      } catch (e) {
        if (api.isCancel(e)) return;
        console.error(e);
        setError("No se pudo obtener la solicitud.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
    return () => cancel?.();
  }, [visible, solicitudId]);

  /* --------- resetea el estado cuando se cierra el modal --------- */
  const handleClose = () => {
    setSolicitud(null);
    setError("");
    onClose();
  };

  /* ----------------- helpers de formato / UI --------------------- */
  const formatearFecha = (f) =>
    f
      ? new Date(f).toLocaleDateString("es-VE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-";

  const mostrarMonto = (v) => {
    const n = Number(v);
    return isNaN(n) ? "0.00" : n.toFixed(2);
  };

  /* ------------------- short-circuit renders --------------------- */
  if (!visible) return null;

  if (loading)
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="p-6 bg-gray-800 rounded-lg shadow text-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            Cargando solicitud…
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );

  if (error)
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="p-6 bg-red-800 rounded-lg shadow text-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {error}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );

  if (!solicitud) return null;

  /* ------------------- variables derivadas ---------------------- */
  const isBolivares = solicitud.moneda === "VES";
  const isPagada = solicitud.estado === "pagada";
  const isCancelada = solicitud.estado === "cancelada";

  const EstadoIcon = () => {
    if (isPagada) return <CheckCircle2 className="w-4 h-4 mr-1" />;
    if (isCancelada) return <AlertCircle className="w-4 h-4 mr-1" />;
    return <Clock className="w-4 h-4 mr-1" />;
  };

  const handleDescargarComprobante = async () => {
    if (!solicitud.comprobante_url) return;
    try {
      setDescargando(true);
      window.open(solicitud.comprobante_url, "_blank");
    } catch (e) {
      console.error(e);
      alert("No se pudo descargar el comprobante");
    } finally {
      setDescargando(false);
    }
  };

  /* -------------------------- render ----------------------------- */
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-5xl p-6 bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          {/* botón cerrar */}
          <button
            onClick={handleClose}
            className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
