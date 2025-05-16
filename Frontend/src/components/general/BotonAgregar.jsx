// src/components/generales/BotonAgregar.jsx
import { Plus } from "lucide-react";

export default function BotonAgregar({
  onClick,
  texto = "Añadir",
  className = "",
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center border border-white text-white
        hover:bg-gray-700 hover:text-white transition-colors font-medium rounded-lg 
        px-4 py-2 text-sm ${className}`}
    >
      <Plus className="w-4 h-4 mr-2" />
      {texto}
    </button>
  );
}
