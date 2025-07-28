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
      setIsMobile(window.innerWidth < 1024);
      if (!isMobile) setIsOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

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

      {/* Overlay para móviles - más transparente */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Aside - con margen superior para no solaparse con navbar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-72 lg:w-80 h-[calc(100vh-4rem)] mt-16 lg:mt-0 bg-gray-800 transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Botón de cerrar en móviles - más destacado */}
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
