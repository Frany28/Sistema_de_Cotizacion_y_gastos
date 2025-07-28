import { useLocation, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

function PapeleraButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const estaEnPapelera = location.pathname === "/papelera";

  return (
    <div
      onClick={() => navigate("/papelera")}
      className={`w-full h-30 rounded-2xl cursor-pointer transition-colors duration-300 ${
        estaEnPapelera ? "bg-blue-700" : "bg-gray-700 hover:bg-gray-500"
      }`}
    >
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <Trash2 size={40} color={estaEnPapelera ? "#FFFFFF" : "#1A56DBFF"} />
        <p
          className={`font-semibold ${
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
