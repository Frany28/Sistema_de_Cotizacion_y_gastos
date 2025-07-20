import VistaPreviaAlmacenamiento from "./VistaPreviaAlmacenamiento";
import PapeleraButton from "./PapeleraButton";
import RegistroDeActividades from "./RegistroDeActividades";
export default function AsideArchivo() {
  return (
    <>
      <div className="left-0 w-[320px] h-full bg-gray-800">
        <div className="grid justify-center items-center gap-4 p-5 h-full">
          <VistaPreviaAlmacenamiento />
          <RegistroDeActividades />
          <PapeleraButton />
        </div>
      </div>
    </>
  );
}
