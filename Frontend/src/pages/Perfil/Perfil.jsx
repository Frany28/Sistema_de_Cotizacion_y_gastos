import AlmacenamientoUtilizado from "../../components/ComponentePerfil/AlmacenamientoUtilizado";
import GraficoArchivosPorTipo from "../../components/ComponentePerfil/GraficosArchivosPorTipo";
import ArchivosRecientes from "../../components/ComponentePerfil/ArchivosRecientes";

function Perfil() {
  return (
    <>
      <AlmacenamientoUtilizado />
      <GraficoArchivosPorTipo />
      <ArchivosRecientes />
    </>
  );
}

export default Perfil;
