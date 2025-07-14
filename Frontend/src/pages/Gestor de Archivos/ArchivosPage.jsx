import AsideArchivo from "../../components/ComponentesArchivos/Componentes del aside/AsideArchivo";
import Busqueda from "../../components/ComponentesArchivos/Busqueda";

function ArchivosPage() {
  return (
    <>
      <div className="flex w-full h-full gap-10">
        <AsideArchivo />
        <Busqueda />
      </div>
    </>
  );
}

export default ArchivosPage;
