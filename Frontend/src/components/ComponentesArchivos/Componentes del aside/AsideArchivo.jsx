import VistaPreviaAlmacenamiento from "./VistaPreviaAlmacenamiento";
import PapeleraButton from "./PapeleraButton";
import RegistroDeActividades from "./RegistroDeActividades";
import { FiChevronRight } from "react-icons/fi";

export default function AsideArchivo() {
  return (
    <div className="fixed lg:sticky top-0 z-10 w-full lg:w-80 h-screen bg-gray-800 transition-all duration-300 ease-in-out transform -translate-x-full lg:translate-x-0">
      {/* Botón de toggle para móviles */}
      <button
        className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-gray-700 rounded-md text-white hover:bg-gray-600 focus:outline-none"
        onClick={() =>
          document
            .querySelector('div[class*="transform"]')
            .classList.toggle("translate-x-0")
        }
        aria-label="Mostrar menú"
      >
        <FiChevronRight className="w-6 h-6" />
      </button>

      <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
        <VistaPreviaAlmacenamiento />
        <RegistroDeActividades />
        <PapeleraButton />
      </div>
    </div>
  );
}
