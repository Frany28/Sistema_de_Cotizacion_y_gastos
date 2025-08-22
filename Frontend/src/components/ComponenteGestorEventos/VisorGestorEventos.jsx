// src/components/ComponenteGestorEventos/VisorGestorEventos.jsx
import { useState } from "react";
import GenerarReporte from "./GenerarReporte";
import ModalOpcionesReporte from "./ModalOpcionesReporte";
import { descargarReporteEventosPdf } from "../../services/eventosArchivosApi";

export default function VisorGestorEventos() {
  const [mostrarModal, setMostrarModal] = useState(false);

  const abrirModal = () => {
    console.log("abrirModal → setMostrarModal(true)");
    setMostrarModal(true);
  };
  const cerrarModal = () => {
    console.log("cerrarModal → setMostrarModal(false)");
    setMostrarModal(false);
  };

  const manejarConfirmar = async (opcionesSeleccion) => {
    try {
      const blob = await descargarReporteEventosPdf(opcionesSeleccion);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "reporte-eventos.pdf";
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el PDF");
    } finally {
      cerrarModal();
    }
  };

  return (
    <>
      <GenerarReporte onGenerarReporte={abrirModal} />
      <ModalOpcionesReporte
        visible={mostrarModal}
        onClose={cerrarModal}
        onConfirmar={manejarConfirmar}
      />
    </>
  );
}
