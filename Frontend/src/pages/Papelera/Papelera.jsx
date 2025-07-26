import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ListaArchivosPapelera from "../../components/ComponentePapelera/ListaArchivosPapelera";

function Papelera() {
  const navigate = useNavigate();

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>
      <ListaArchivosPapelera />
    </>
  );
}

export default Papelera;
