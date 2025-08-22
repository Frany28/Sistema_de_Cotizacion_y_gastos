import { useState } from "react";
import GenerarReporte from "./GenerarReporte";
import ModalOpcionesReporte from "./ModalOpcionesReporte";
import { descargarReporteEventosPdf } from "../../services/eventosArchivosApi";

export default function VisorGestorEventos() {
  const [mostrarModal, setMostrarModal] = useState(false);

  const abrirModal = () => setMostrarModal(true);
  const cerrarModal = () => setMostrarModal(false);

  const manejarConfirmar = async (opciones) => {
    try {
      const blob = await descargarReporteEventosPdf(opciones);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reporte-eventos.pdf";
      a.click();
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
