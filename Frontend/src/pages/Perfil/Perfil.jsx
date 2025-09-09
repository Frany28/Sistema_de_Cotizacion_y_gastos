import AlmacenamientoUtilizado from "../../components/ComponentePerfil/AlmacenamientoUtilizado";
import GraficoArchivosPorTipo from "../../components/ComponentePerfil/GraficosArchivosPorTipo";
import ArchivosRecientes from "../../components/ComponentePerfil/ArchivosRecientes";
import EstadisticasAlmacenamiento from "../../components/ComponentePerfil/EstadisticasAlmacenamiento";
import TarjetaPerfil from "../../components/ComponentePerfil/TarjetaPerfil";

function Perfil() {
  return (
    <>
      <div className="flex md:flex-row justify-center items-center gap-6 mb-6">
        <AlmacenamientoUtilizado />
        <TarjetaPerfil />
      </div>
      <div className="flex flex-col md:flex-row justify-center items-start gap-6 mb-6">
        <GraficoArchivosPorTipo />
        <ArchivosRecientes />
        <EstadisticasAlmacenamiento />
      </div>
    </>
  );
}

export default Perfil;
