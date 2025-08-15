import GenerarReporte from "../../components/ComponenteGestorEventos/GenerarReporte";
import TarjetaArchivosSubidos from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosSubidos";
import TarjetaArchivosEliminados from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosEliminados";
import TarjetaTotalDeArchivos from "../../components/ComponenteGestorEventos/tarjetas/TarjetaTotalDeArchivos";
import TarjetaArchivosReemplazados from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosReemplazados";
import GraficoTendenciasActividad from "../../components/ComponenteGestorEventos/GraficoTendenciasActividad";

function GestorDeEventosPage() {
  return (
    <div className="pt-5">
      {/* Header grande con su propio contenedor */}
      <GenerarReporte />

      {/* MISMO contenedor del header para alinear bordes y padding */}
      <div className="mx-auto w-full max-w-[1480px] px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mt-6">
          <TarjetaArchivosSubidos />
          <TarjetaArchivosEliminados />
          <TarjetaTotalDeArchivos />
          <TarjetaArchivosReemplazados />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1480px] px-6 md:px-8">
        <GraficoTendenciasActividad alturaPx={420} />
      </div>
    </div>
  );
}

export default GestorDeEventosPage;
