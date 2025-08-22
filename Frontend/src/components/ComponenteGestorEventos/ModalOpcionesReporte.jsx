// src/components/ComponenteGestorEventos/ModalOpcionesReporte.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  const confirmar = () => {
    const opcionesSeleccion = { tipoReporte };
    if (tipoReporte === "mensual")
      Object.assign(opcionesSeleccion, { mes, anio });
    if (tipoReporte === "anual") Object.assign(opcionesSeleccion, { anio });
    if (tipoReporte === "rango") {
      if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
        alert("Selecciona un rango válido (fecha fin ≥ fecha inicio).");
        return;
      }
      Object.assign(opcionesSeleccion, { fechaInicio, fechaFin });
    }
    onConfirmar?.(opcionesSeleccion);
  };

  // Guardia SSR + visibilidad
  if (!visible || typeof document === "undefined") return null;

  const estiloOverlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2147483647,
  };

  const estiloPanel = {
    width: "100%",
    maxWidth: 640,
    background: "#1f2937",
    color: "white",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  };

  const estiloBoton = {
    cursor: "pointer",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
  };

  // 👇 Nota: cierro solo si el clic fue exactamente en el backdrop
  const manejarClickBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      style={estiloOverlay}
      onClick={manejarClickBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div style={estiloPanel}>
        {/* ... resto del contenido tal como lo tienes (botones Mensual/Anual/Rango, inputs y acciones) ... */}
        {/* Botones footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 18,
          }}
        >
          <button
            onClick={onClose}
            style={{
              ...estiloBoton,
              background: "#374151",
              border: "1px solid #4b5563",
              color: "white",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            style={{ ...estiloBoton, background: "#6366f1", color: "white" }}
          >
            Generar PDF
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
