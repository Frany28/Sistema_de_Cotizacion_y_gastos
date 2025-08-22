import { useState, useEffect } from "react";
import GenerarReporte from "../../components/ComponenteGestorEventos/GenerarReporte";
import ModalOpcionesReporte from "../../components/ComponenteGestorEventos/ModalOpcionesReporte";
import TarjetaArchivosSubidos from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosSubidos";
import TarjetaArchivosEliminados from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosEliminados";
import TarjetaTotalDeArchivos from "../../components/ComponenteGestorEventos/tarjetas/TarjetaTotalDeArchivos";
import TarjetaArchivosReemplazados from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosReemplazados";
import GraficoTendenciasActividad from "../../components/ComponenteGestorEventos/GraficoTendenciasActividad";
import ActividadRecienteArchivos from "../../components/ComponenteGestorEventos/ActividadRecienteArchivos";
import { descargarReporteEventosPdf } from "../../services/eventosArchivosApi";

function GestorDeEventosPage() {
  const [mostrarModal, setMostrarModal] = useState(false);

  const abrirModal = () => {
    console.log("abrirModal");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    console.log("cerrarModal");
    setMostrarModal(false);
  };

  useEffect(() => {
    console.log("mostrarModal:", mostrarModal);
  }, [mostrarModal]);

  const manejarConfirmar = async (opcionesSeleccion) => {
    try {
      const blob = await descargarReporteEventosPdf(opcionesSeleccion);
      const url = URL.createObjectURL(blob);
      const enlaceDescarga = document.createElement("a");
      enlaceDescarga.href = url;
      enlaceDescarga.download = "reporte-eventos.pdf";
      enlaceDescarga.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("No se pudo generar el PDF");
    } finally {
      cerrarModal();
    }
  };

  return (
    <div className="pt-5">
      {/* Header con el botón de generar reporte */}
      <GenerarReporte onGenerarReporte={abrirModal} />

      {/* Modal de opciones */}
      <ModalOpcionesReporte
        visible={mostrarModal}
        onClose={cerrarModal}
        onConfirmar={manejarConfirmar}
      />

      <div className="mx-auto w-full max-w-[1480px] px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mt-6">
          <TarjetaArchivosSubidos />
          <TarjetaArchivosEliminados />
          <TarjetaTotalDeArchivos />
          <TarjetaArchivosReemplazados />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1480px] px-6 md:pt-5">
        <GraficoTendenciasActividad alturaPx={420} />
      </div>
      <div className="mx-auto w-full max-w-[1480px] px-6 md:pt-5">
        <ActividadRecienteArchivos />
      </div>
    </div>
  );
}

export default GestorDeEventosPage;
