import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, FileText, Calendar, CalendarRange, Download } from "lucide-react";

export default function ModalOpcionesReporte({
  visible = false,
  onClose,
  onConfirmar,
  titulo = "Generar reporte de eventos",
  mensaje = "Selecciona el tipo de periodo para el informe en PDF:",
}) {
  // Estado del selector
  const [tipoReporte, setTipoReporte] = useState("mensual"); // mensual | anual | rango
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Bloqueo de scroll al abrir
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  // Cerrar con Escape
  useEffect(() => {
    if (!visible) return;
    const manejarTecla = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [visible, onClose]);

  const manejarClickBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const confirmar = () => {
    const opcionesSeleccion = { tipoReporte };
    if (tipoReporte === "mensual") {
      Object.assign(opcionesSeleccion, { mes, anio });
    } else if (tipoReporte === "anual") {
      Object.assign(opcionesSeleccion, { anio });
    } else if (tipoReporte === "rango") {
      if (!fechaInicio || !fechaFin) {
        alert("Selecciona un rango válido (fecha fin ≥ fecha inicio).");
        return;
      }
      const inicioISO = formatearFechaGuardar(fechaInicio);
      const finISO = formatearFechaGuardar(fechaFin);

      if (finISO < inicioISO) {
        alert("Selecciona un rango válido (fecha fin ≥ fecha inicio).");
        return;
      }

      Object.assign(opcionesSeleccion, { fechaInicio, fechaFin });
    }
    onConfirmar?.(opcionesSeleccion);
  };

  // Variantes de animación
  const variantesOverlay = { oculto: { opacity: 0 }, visible: { opacity: 1 } };
  const variantesPanel = {
    oculto: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  if (!visible || typeof document === "undefined") return null;

  // Convierte yyyy-mm-dd a dd/mm/yyyy
  const formatearFechaMostrar = (fecha) => {
    if (!fecha) return "";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  };

  // Convierte dd/mm/yyyy a yyyy-mm-dd (para el input type=date)
  const formatearFechaGuardar = (fecha) => {
    if (!fecha) return "";
    const [dia, mes, anio] = fecha.split("/");
    return `${anio}-${mes}-${dia}`;
  };

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overlay"
          initial="oculto"
          animate="visible"
          exit="oculto"
          variants={variantesOverlay}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={manejarClickBackdrop}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            key="panel"
            initial="oculto"
            animate="visible"
            exit="oculto"
            variants={variantesPanel}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-xl rounded-lg bg-gray-800 text-white shadow-xl border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-900/60 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-400 font-semibold">
                    {titulo}
                  </p>
                  <p className="text-xs text-gray-300">{mensaje}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="cursor-pointer p-2 rounded-md hover:bg-white/10 text-gray-300 hover:text-white"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="px-5 py-4">
              {/* Botones de tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setTipoReporte("mensual")}
                  className={`cursor-pointer group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                    ${
                      tipoReporte === "mensual"
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-white/10 bg-gray-700/40 text-gray-200 hover:bg-gray-700/60"
                    }`}
                >
                  <Calendar className="w-4 h-4" />
                  Mensual
                </button>

                <button
                  type="button"
                  onClick={() => setTipoReporte("anual")}
                  className={`cursor-pointer group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                    ${
                      tipoReporte === "anual"
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-white/10 bg-gray-700/40 text-gray-200 hover:bg-gray-700/60"
                    }`}
                >
                  <Calendar className="w-4 h-4" />
                  Anual
                </button>

                <button
                  type="button"
                  onClick={() => setTipoReporte("rango")}
                  className={`cursor-pointer group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                    ${
                      tipoReporte === "rango"
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-white/10 bg-gray-700/40 text-gray-200 hover:bg-gray-700/60"
                    }`}
                >
                  <CalendarRange className="w-4 h-4" />
                  Rango
                </button>
              </div>

              {/* Controles según tipo */}
              {tipoReporte === "mensual" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-300">Mes</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(Number(e.target.value))}
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-300">Año</label>
                    <input
                      type="number"
                      value={anio}
                      onChange={(e) => setAnio(Number(e.target.value))}
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {tipoReporte === "anual" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-300">Año</label>
                  <input
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {tipoReporte === "rango" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-300">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={formatearFechaGuardar(fechaInicio)}
                      onChange={(e) =>
                        setFechaInicio(formatearFechaMostrar(e.target.value))
                      }
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-300">Fecha fin</label>
                    <input
                      type="date"
                      value={formatearFechaGuardar(fechaFin)}
                      onChange={(e) =>
                        setFechaFin(formatearFechaMostrar(e.target.value))
                      }
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 pb-5">
              <button
                onClick={onClose}
                className="cursor-pointer px-4 py-2 text-sm rounded-md bg-gray-700/60 border border-white/10 hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4" />
                Generar PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
