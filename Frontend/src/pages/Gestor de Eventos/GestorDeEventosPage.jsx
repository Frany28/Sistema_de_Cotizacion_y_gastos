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

// clases del grid (camelCase y en español)
const claseGridTarjetas = `
  grid
  grid-cols-[repeat(auto-fit,minmax(220px,1fr))]
  auto-rows-fr
  items-stretch
  gap-x-4 gap-y-6
`;

function GestorDeEventosPage() {
  const abrirModal = () => {
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

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
      console.error("Error al generar PDF:", error);
      alert("No se pudo generar el PDF");
    } finally {
      cerrarModal();
    }
  };

  return (
    <div className="pt-5">
      {/* Encabezado con botón para generar reporte */}
      <GenerarReporte onGenerarReporte={abrirModal} />

      {/* Modal de opciones para el reporte */}
      <ModalOpcionesReporte
        visible={mostrarModal}
        onClose={cerrarModal}
        onConfirmar={manejarConfirmar}
      />

      {/* GRID de tarjetas - margen inferior para no chocar con Tendencias */}
      <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8 mt-6 mb-8">
        <section className={claseGridTarjetas}>
          <div className="h-full">
            <TarjetaArchivosSubidos />
          </div>
          <div className="h-full">
            <TarjetaArchivosEliminados />
          </div>
          <div className="h-full">
            <TarjetaTotalDeArchivos />
          </div>
          <div className="h-full">
            <TarjetaArchivosReemplazados />
          </div>
        </section>
      </div>

      {/* Tendencias de actividad */}
      <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <GraficoTendenciasActividad alturaPx={420} />
      </div>

      {/* Actividad reciente */}
      <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8 md:pt-5">
        <ActividadRecienteArchivos />
      </div>
    </div>
  );
}

export default GestorDeEventosPage;
