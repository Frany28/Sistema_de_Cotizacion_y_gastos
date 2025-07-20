import { Trash2 } from "lucide-react";
function PapeleraButton() {
  return (
    <>
      <div
        className="w-69 h-30 bg-gray-700 rounded-2xl"
        onClick={() => (window.location.href = "/papelera")}
      >
        <div className="flex flex-col items-center justify-center h-full gap-2 hover:bg-gray-400 hover:cursor-pointer transition-colors duration-300 rounded-2xl">
          <Trash2 size={40} color="#1A56DBFF" />
          <p className="text-white font-semibold">Papelera</p>
        </div>
      </div>
    </>
  );
}

export default PapeleraButton;
