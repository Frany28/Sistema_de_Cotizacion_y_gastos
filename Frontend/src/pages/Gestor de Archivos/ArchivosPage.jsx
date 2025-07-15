import AsideArchivo from "../../components/ComponentesArchivos/Componentes del aside/AsideArchivo";
import Busqueda from "../../components/ComponentesArchivos/Busqueda";
import TablaArchivos from "../../components/ComponentesArchivos/TablaArchivos";

function ArchivosPage() {
  return (
    <>
      <div className="flex w-full h-full gap-10">
        <AsideArchivo />
        <div>
          <Busqueda />
          <TablaArchivos />
        </div>
      </div>
    </>
  );
}

export default ArchivosPage;
