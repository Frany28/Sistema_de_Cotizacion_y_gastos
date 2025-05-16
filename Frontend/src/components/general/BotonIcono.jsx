import {
  Edit,
  Trash2,
  Eye,
  PlusCircle,
  RefreshCw,
  DollarSign,
} from "lucide-react"; 

export default function BotonIcono({ tipo, onClick, titulo = "" }) {
  const estilosBase =
    "p-2 rounded-full text-white hover:scale-110 transition duration-150 ease-in-out";

  const iconos = {
    editar: <Edit size={18} />,
    eliminar: <Trash2 size={18} />,
    ver: <Eye size={18} />,
    agregar: <PlusCircle size={18} />,
    estado: <RefreshCw size={18} />,
    abonar: <DollarSign size={18} />, // ← NUEVO icono
  };

  const colores = {
    editar: "bg-blue-600 hover:bg-blue-700",
    eliminar: "bg-red-600 hover:bg-red-700",
    ver: "bg-green-600 hover:bg-green-700",
    agregar: "bg-indigo-600 hover:bg-indigo-700",
    estado: "bg-yellow-500 hover:bg-yellow-600",
    abonar: "bg-emerald-600 hover:bg-emerald-700", // ← NUEVO color
  };

  return (
    <button
      onClick={onClick}
      title={titulo}
      className={`${estilosBase} ${colores[tipo]}`}
    >
      {iconos[tipo]}
    </button>
  );
}
