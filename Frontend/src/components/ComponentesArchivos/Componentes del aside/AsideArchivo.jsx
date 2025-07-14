import VistaPreviaAlmacenamiento from "./VistaPreviaAlmacenamiento";
import PapeleraButton from "./PapeleraButton";
import RegistroDeActividades from "./RegistroDeActividades";
export default function AsideArchivo() {
  return (
    <>
      <div className="left-0 w-[320px] h-screen bg-gray-800">
        <div className="grid justify-center items-center gap-4 pl-4 pt-25">
          <VistaPreviaAlmacenamiento />
          <PapeleraButton />
          <RegistroDeActividades />
        </div>
      </div>
    </>
  );
}
