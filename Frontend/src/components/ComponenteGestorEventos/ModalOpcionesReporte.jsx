import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  FileText,
  Calendar,
  CalendarRange,
  Download,
  Loader2,
} from "lucide-react";

export default function ModalOpcionesReporte({
  visible = false,
  onClose,
  onConfirmar,
  titulo = "Generar reporte de eventos",
  mensaje = "Selecciona el tipo de periodo para el informe en PDF:",
  // estaCargando externo opcional por si quieres controlarlo desde el padre
  estaCargando = false,
}) {
  // Estado del selector
  const [tipoReporte, setTipoReporte] = useState("mensual"); // mensual | anual | rango
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Estado interno de generación (prioriza el control interno, pero respeta prop externa)
  const [estaGenerando, setEstaGenerando] = useState(false);
  const generando = estaGenerando || estaCargando;

  // Bloqueo de scroll al abrir
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  // Cerrar con Escape (deshabilitado mientras genera)
  useEffect(() => {
    if (!visible || generando) return;
    const manejarTecla = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [visible, onClose, generando]);

  const manejarClickBackdrop = (e) => {
    if (generando) return; // no permitir cerrar mientras genera
    if (e.target === e.currentTarget) onClose?.();
  };

  const confirmar = async () => {
    const opcionesSeleccion = { tipoReporte };
    if (tipoReporte === "mensual") {
      Object.assign(opcionesSeleccion, { mes, anio });
    } else if (tipoReporte === "anual") {
      Object.assign(opcionesSeleccion, { anio });
    } else if (tipoReporte === "rango") {
      if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
        alert("Selecciona un rango válido (fecha fin ≥ fecha inicio).");
        return;
      }
      Object.assign(opcionesSeleccion, { fechaInicio, fechaFin });
    }

    try {
      setEstaGenerando(true);
      // Espera a que el padre termine (descarga/genera PDF)
      await onConfirmar?.(opcionesSeleccion);
      // Si el padre no cierra el modal, lo dejamos listo para que él decida
    } catch (error) {
      console.error("Error al confirmar generación:", error);
      // En caso de error, re-habilitar botones para reintentar
      setEstaGenerando(false);
    }
  };

  // Variantes de animación
  const variantesOverlay = { oculto: { opacity: 0 }, visible: { opacity: 1 } };
  const variantesPanel = {
    oculto: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="overlay"
          initial="oculto"
          animate="visible"
          exit="oculto"
          variants={variantesOverlay}
          className={`fixed inset-0 z-50 flex items-center justify-center ${
            generando ? "cursor-wait" : ""
          } bg-black/40 backdrop-blur-sm`}
          onClick={manejarClickBackdrop}
          role="dialog"
          aria-modal="true"
          aria-busy={generando}
        >
          <motion.div
            key="panel"
            initial="oculto"
            animate="visible"
            exit="oculto"
            variants={variantesPanel}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={`relative w-full max-w-xl rounded-lg bg-gray-800 text-white shadow-xl border border-white/10 ${
              generando ? "pointer-events-none" : "pointer-events-auto"
            }`}
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
                className="cursor-pointer p-2 rounded-md hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Cerrar modal"
                disabled={generando}
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
                  disabled={generando}
                  className={`cursor-pointer group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed
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
                  disabled={generando}
                  className={`cursor-pointer group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed
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
                  disabled={generando}
                  className={`cursor-pointer group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed
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
                      disabled={generando}
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
                      disabled={generando}
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
                    disabled={generando}
                    className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
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
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      disabled={generando}
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-300">Fecha fin</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      disabled={generando}
                      className="bg-gray-700/60 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 pb-5">
              <button
                onClick={onClose}
                disabled={generando}
                className="cursor-pointer px-4 py-2 text-sm rounded-md bg-gray-700/60 border border-white/10 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={generando}
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                aria-busy={generando}
              >
                {generando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando reporte…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generar PDF
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
