//ruta: /pages/Gestor de Archivos/Archivo Especifico/VistaDetalleArchivo.jsx
import AsideArchivo from "../../../components/ComponentesArchivos/Componentes del aside/AsideArchivo";
import DetalleArchivo from "../../../components/ComponentesArchivos/ArchivoEspecifico/DetalleArchivos";
import CantidadVersionesArchivos from "../../../components/ComponentesArchivos/ArchivoEspecifico/CantidadVersionesArchivos";

function VistaDetalleArchivo() {
  return (
    <div className="flex w-full h-full gap-10">
      <AsideArchivo />
      <div className="gap-3 flex flex-col w-full h-full">
        <DetalleArchivo />
        <CantidadVersionesArchivos />
      </div>
    </div>
  );
}

export default VistaDetalleArchivo;
