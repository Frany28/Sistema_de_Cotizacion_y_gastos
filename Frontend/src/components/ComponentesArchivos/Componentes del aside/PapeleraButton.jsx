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
      className={`w-full lg:w-69 h-24 lg:h-30 rounded-2xl cursor-pointer transition-colors duration-300 ${
        estaEnPapelera ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-500"
      }`}
    >
      <div className="flex flex-col items-center justify-center h-full gap-1 lg:gap-2">
        <Trash2 size={32} color={estaEnPapelera ? "#FFFFFF" : "#1A56DBFF"} />
        <p
          className={`font-semibold text-sm lg:text-base ${
            estaEnPapelera ? "text-white" : "text-gray-200"
          }`}
        >
          Papelera
        </p>
      </div>
    </div>
  );
}

export default PapeleraButton;
