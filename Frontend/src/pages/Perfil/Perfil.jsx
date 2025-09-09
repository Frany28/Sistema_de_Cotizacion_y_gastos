import AlmacenamientoUtilizado from "../../components/ComponentePerfil/AlmacenamientoUtilizado";
import GraficoArchivosPorTipo from "../../components/ComponentePerfil/GraficosArchivosPorTipo";
import ArchivosRecientes from "../../components/ComponentePerfil/ArchivosRecientes";
import EstadisticasAlmacenamiento from "../../components/ComponentePerfil/EstadisticasAlmacenamiento";
import TarjetaPerfil from "../../components/ComponentePerfil/TarjetaPerfil";

function Perfil() {
  return (
    <div className="p-6 space-y-6">
      {/* Fila superior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Almacenamiento ocupa 2/3 y perfil 1/3 */}
        <div className="md:col-span-2">
          <AlmacenamientoUtilizado />
        </div>
        <div className="md:col-span-1">
          <TarjetaPerfil />
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GraficoArchivosPorTipo />
        <ArchivosRecientes />
        <EstadisticasAlmacenamiento />
      </div>
    </div>
  );
}

export default Perfil;
