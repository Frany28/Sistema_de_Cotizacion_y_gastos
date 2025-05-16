// src/components/general/Paginacion.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Paginacion({
  paginaActual,
  totalPaginas,
  onCambiarPagina,
}) {
  if (totalPaginas <= 1) return null;

  const generarPaginas = () => {
    const paginas = [];
    for (let i = 1; i <= totalPaginas; i++) {
      paginas.push(i);
    }
    return paginas;
  };

  return (
    <nav aria-label="Paginación" className="flex justify-center mt-4 mb-2">
      <ul className="inline-flex gap-1 items-center shadow-sm bg-white dark:bg-gray-800 px-2 py-1 rounded-xl border border-gray-300 dark:border-gray-700">
        {/* Botón Anterior */}
        <li>
          <button
            onClick={() => onCambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors duration-150 ${
              paginaActual === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </li>

        {/* Botones por número */}
        {generarPaginas().map((pagina) => (
          <li key={pagina}>
            <button
              onClick={() => onCambiarPagina(pagina)}
              className={`w-9 h-9 rounded-md font-medium transition-colors duration-150 ${
                pagina === paginaActual
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {pagina}
            </button>
          </li>
        ))}

        {/* Botón Siguiente */}
        <li>
          <button
            onClick={() => onCambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors duration-150 ${
              paginaActual === totalPaginas
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
