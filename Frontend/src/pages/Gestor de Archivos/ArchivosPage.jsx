import AsideArchivo from "../../components/ComponentesArchivos/Componentes del aside/AsideArchivo";
import Busqueda from "../../components/ComponentesArchivos/Busqueda";
import TablaArchivos from "../../components/ComponentesArchivos/TablaArchivos";

function ArchivosPage() {
  return (
    <>
      <div className="flex w-full h-full gap-10">
        <AsideArchivo />
        <div className="gap-3 flex flex-col w-full h-full">
          <Busqueda />
          <TablaArchivos />
        </div>
      </div>
    </>
  );
}

export default ArchivosPage;
