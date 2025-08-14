import GenerarReporte from "../../components/ComponenteGestorEventos/GenerarReporte";
import TarjetaArchivosSubidos from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosSubidos";
import TarjetaArchivosEliminados from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosEliminados";
import TarjetaTotalDeArchivos from "../../components/ComponenteGestorEventos/tarjetas/TarjetaTotalDeArchivos";
import TarjetaArchivosReemplazados from "../../components/ComponenteGestorEventos/tarjetas/TarjetaArchivosReemplazados";

function GestorDeEventosPage() {
  return (
    <>
      <div className="pt-5 ">
        <GenerarReporte />

        <div className="grid grid-cols-1 items-center justify-center md:grid-cols-2 xl:grid-cols-4 gap-2 p-5">
          <TarjetaArchivosSubidos />
          <TarjetaArchivosEliminados />
          <TarjetaTotalDeArchivos />
          <TarjetaArchivosReemplazados />
        </div>
      </div>
    </>
  );
}

export default GestorDeEventosPage;
