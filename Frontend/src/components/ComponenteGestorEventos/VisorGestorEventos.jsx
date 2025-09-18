// src/components/ComponenteGestorEventos/VisorGestorEventos.jsx
import React, { useState } from "react";

// ⬇️ Ajusta estas rutas a tu estructura real de carpetas
import GenerarReporte from "../GenerarReporte";
import ModalOpcionesReporte from "./ModalOpcionesReporte";
import { descargarReporteEventosPdf } from "../../services/eventosArchivosApi";

export default function VisorGestorEventos() {
  // Estado para controlar la visibilidad del modal
  const [mostrarModal, setMostrarModal] = useState(false);

  // Abrir y cerrar modal
  const abrirModal = () => setMostrarModal(true);
  const cerrarModal = () => setMostrarModal(false);

  // Confirmación del modal (genera y descarga el PDF)
  const manejarConfirmar = async (opcionesSeleccion) => {
    try {
      setGenerandoReporte(true);
      const blob = await descargarReporteEventosPdf(opcionesSeleccion);
      const url = URL.createObjectURL(blob);
      const enlaceDescarga = document.createElement("a");
      enlaceDescarga.href = url;
      enlaceDescarga.download = "reporte-eventos.pdf";
      enlaceDescarga.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("No se pudo generar el PDF");
    } finally {
      cerrarModal();
    }
  };

  return (
    <>
      {/* Botón/trigger para abrir el modal */}
      <GenerarReporte onGenerarReporte={abrirModal} />

      {/* Modal con opciones del reporte */}
      <ModalOpcionesReporte
        visible={mostrarModal}
        onClose={cerrarModal}
        onConfirmar={manejarConfirmar}
        estaCargando={generandoReporte}
      />
    </>
  );
}
