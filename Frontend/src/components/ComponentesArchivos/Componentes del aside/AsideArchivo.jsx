import VistaPreviaAlmacenamiento from "./VistaPreviaAlmacenamiento";
import PapeleraButton from "./PapeleraButton";
import RegistroDeActividades from "./RegistroDeActividades";
import { FiChevronRight, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";

export default function AsideArchivo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const esMovil = window.innerWidth < 1024;
      setIsMobile(esMovil);
      if (!esMovil) setIsOpen(false);
    };

    handleResize(); // ejecuta en primer render
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Botón de toggle para móviles */}
      <button
        className={`lg:hidden fixed top-20 left-4 z-40 p-2 bg-gray-700 rounded-md text-white hover:bg-gray-600 focus:outline-none transition-all ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onClick={() => setIsOpen(true)}
        aria-label="Mostrar menú"
      >
        <FiChevronRight className="w-6 h-6" />
      </button>

      {/* Overlay para móviles */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-gray-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Aside adaptado para desktop y móvil */}
      <aside
        className={`${
          isMobile
            ? "fixed top-16 h-[calc(100vh-64px)]"
            : "lg:sticky top-16 h-[calc(100vh-64px)]"
        } left-0 z-40 w-72 lg:w-80 bg-gray-800 transition-all duration-300 ease-in-out 
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Botón cerrar en móviles */}
        {isMobile && (
          <button
            className="absolute top-2 right-2 p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
          <VistaPreviaAlmacenamiento />
          <RegistroDeActividades />
          <PapeleraButton />
        </div>
      </aside>
    </>
  );
}
