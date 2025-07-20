import VistaPreviaAlmacenamiento from "./VistaPreviaAlmacenamiento";
import PapeleraButton from "./PapeleraButton";
import RegistroDeActividades from "./RegistroDeActividades";
export default function AsideArchivo() {
  return (
    <>
      <div className="left-0 w-[320px] min-h-screen bg-gray-800">
        <div className="flex flex-col gap-2 px-4 pt-6 pb-4">
          <VistaPreviaAlmacenamiento />
          <RegistroDeActividades />
          <PapeleraButton />
        </div>
      </div>
    </>
  );
}
