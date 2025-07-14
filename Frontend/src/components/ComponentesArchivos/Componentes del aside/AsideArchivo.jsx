import VistaPreviaAlmacenamiento from "./VistaPreviaAlmacenamiento";
import PapeleraButton from "./PapeleraButton";
import RegistroDeActividades from "./RegistroDeActividades";
export default function AsideArchivo() {
  return (
    <>
      <div className="left-0 w-[320px] h-full bg-gray-800">
        <div className="flex flex-col items-center gap-4 p-4 pt-25 pl-8">
          <VistaPreviaAlmacenamiento />
          <PapeleraButton />
          <RegistroDeActividades />
        </div>
      </div>
    </>
  );
}
