// PapeleraButton.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

function PapeleraButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const estaEnPapelera = location.pathname === "/papelera";

  return (
    <div
      onClick={() => navigate("/papelera")}
      className={`w-full sm:w-44 lg:w-48 h-24 sm:h-24 rounded-2xl cursor-pointer transition-colors duration-300 flex flex-col items-center justify-center ${
        estaEnPapelera ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-600"
      }`}
    >
      <Trash2
        size={28}
        className={`transition duration-200 ${
          estaEnPapelera ? "text-white" : "text-blue-400"
        }`}
      />
      <p
        className={`mt-2 text-sm font-semibold ${
          estaEnPapelera ? "text-white" : "text-gray-200"
        }`}
      >
        Papelera
      </p>
    </div>
  );
}

export default PapeleraButton;
