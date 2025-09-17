// src/components/ComponenteGestorEventos/VisorGestorEventos.jsx

import GenerarReporte from "../GenerarReporte";
import ModalOpcionesReporte from "./ModalOpcionesReporte";
import { descargarReporteEventosPdf } from "../../services/eventosArchivosApi";

export default function VisorGestorEventos() {
  const [mostrarModal, setMostrarModal] = useState(false);

  const manejarConfirmar = async (opcionesSeleccion) => {
    try {
      const blob = await descargarReporteEventosPdf(opcionesSeleccion);
      const url = URL.createObjectURL(blob);
      const enlaceDescarga = document.createElement("a");
      enlaceDescarga.href = url;
      enlaceDescarga.download = "reporte-eventos.pdf";
      enlaceDescarga.click();
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
