import AsideArchivo from "../../components/ComponentesArchivos/Componentes del aside/AsideArchivo";
import TablaArchivos from "../../components/ComponentesArchivos/TablaArchivos";

function ArchivosPage() {
  return (
    <>
      <div className="flex w-full h-full gap-4">
        <AsideArchivo />
        <div className="gap-3 flex flex-col w-full h-full p-4">
          <TablaArchivos />
        </div>
      </div>
    </>
  );
}

export default ArchivosPage;
