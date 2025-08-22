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

  // Cerrar SOLO si el clic fue exactamente sobre el backdrop (no el panel)
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h3 style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>
            Generar reporte
          </h3>
          <button
            onClick={onClose}
            style={{ ...estiloBoton, background: "#374151" }}
          >
            Cerrar
          </button>
        </div>

        <p
          style={{
            color: "#d1d5db",
            fontSize: 13,
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Seleccione el tipo de periodo para el informe en PDF.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            { id: "mensual", etiqueta: "Mensual" },
            { id: "anual", etiqueta: "Anual" },
            { id: "rango", etiqueta: "Rango" },
          ].map(({ id, etiqueta }) => (
            <button
              key={id}
              onClick={() => setTipoReporte(id)}
              style={{
                ...estiloBoton,
                padding: "10px 12px",
                background: tipoReporte === id ? "#6366f1" : "#374151",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {tipoReporte === "mensual" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={{ fontSize: 13, color: "#d1d5db" }}>Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                style={{
                  width: "100%",
                  background: "#374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #4b5563",
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#d1d5db" }}>Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                style={{
                  width: "100%",
                  background: "#374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #4b5563",
                }}
              />
            </div>
          </div>
        )}

        {tipoReporte === "anual" && (
          <div>
            <label style={{ fontSize: 13, color: "#d1d5db" }}>Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              style={{
                width: "100%",
                background: "#374151",
                color: "white",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #4b5563",
              }}
            />
          </div>
        )}

        {tipoReporte === "rango" && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={{ fontSize: 13, color: "#d1d5db" }}>
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={{
                  width: "100%",
                  background: "#374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #4b5563",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#d1d5db" }}>
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={{
                  width: "100%",
                  background: "#374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #4b5563",
                }}
              />
            </div>
          </div>
        )}

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
