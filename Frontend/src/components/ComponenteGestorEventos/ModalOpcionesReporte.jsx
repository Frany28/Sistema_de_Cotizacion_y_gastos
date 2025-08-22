// src/components/ComponenteGestorEventos/ModalOpcionesReporte.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, CalendarRange, CalendarClock } from "lucide-react";

export default function ModalOpcionesReporte({
  visible,
  onClose,
  onConfirmar,
}) {
  const [tipoReporte, setTipoReporte] = useState("mensual");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const contenedorRef = useRef(null);

  // Bloquear scroll del body mientras el modal está visible
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!visible) return;
    const manejarKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", manejarKey);
    return () => window.removeEventListener("keydown", manejarKey);
  }, [visible, onClose]);

  // Cerrar al hacer click en el backdrop
  const manejarClickBackdrop = (e) => {
    if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
      onClose?.();
    }
  };

  const confirmar = () => {
    const payloadSeleccion = { tipoReporte };
    if (tipoReporte === "mensual")
      Object.assign(payloadSeleccion, { mes, anio });
    if (tipoReporte === "anual") Object.assign(payloadSeleccion, { anio });
    if (tipoReporte === "rango") {
      if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
        alert("Selecciona un rango válido (fecha fin ≥ fecha inicio).");
        return;
      }
      Object.assign(payloadSeleccion, { fechaInicio, fechaFin });
    }
    onConfirmar?.(payloadSeleccion);
  };

  if (!visible) return null;

  return createPortal(
    <div
      onMouseDown={manejarClickBackdrop}
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={contenedorRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl bg-gray-800 border border-white/10 shadow-xl p-6"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-400 hover:text-white"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-white font-semibold text-lg mb-1">
          Generar reporte
        </h3>
        <p className="text-gray-300 text-sm mb-5">
          Seleccione el tipo de periodo para el informe en PDF.
        </p>

        {/* selector de tipo */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { id: "mensual", icono: CalendarClock, etiqueta: "Mensual" },
            { id: "anual", icono: Calendar, etiqueta: "Anual" },
            { id: "rango", icono: CalendarRange, etiqueta: "Rango" },
          ].map(({ id, icono: Icono, etiqueta }) => (
            <button
              key={id}
              onClick={() => setTipoReporte(id)}
              className={`cursor-pointer flex items-center gap-2 justify-center rounded-lg px-3 py-2 border transition
                ${
                  tipoReporte === id
                    ? "bg-indigo-500 text-white border-indigo-400"
                    : "bg-gray-700/60 text-gray-200 border-gray-600 hover:bg-gray-700"
                }`}
            >
              <Icono className="w-4 h-4" />
              <span className="text-sm">{etiqueta}</span>
            </button>
          ))}
        </div>

        {/* controles según tipo */}
        {tipoReporte === "mensual" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
              />
            </div>
          </div>
        )}

        {tipoReporte === "anual" && (
          <div>
            <label className="block text-sm text-gray-300 mb-1">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
            />
          </div>
        )}

        {tipoReporte === "rango" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-gray-700 text-white text-sm px-4 py-2 border border-gray-600 hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            className="cursor-pointer rounded-lg bg-indigo-500 text-white text-sm px-4 py-2 hover:bg-indigo-400"
          >
            Generar PDF
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
