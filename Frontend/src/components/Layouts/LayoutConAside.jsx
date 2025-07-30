import AsideArchivo from "../ComponentesArchivos/Componentes del aside/AsideArchivo.jsx";
import { Outlet } from "react-router-dom";

export default function LayoutConAside() {
  return (
    <div className="flex w-full min-h-screen">
      <AsideArchivo />
      <div className="flex-1 bg-gray-900 overflow-auto mt-16 ml-0 lg:ml-10 p-4">
        <Outlet />
      </div>
    </div>
  );
}
