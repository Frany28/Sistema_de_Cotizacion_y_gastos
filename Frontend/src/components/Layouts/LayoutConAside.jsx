import AsideArchivo from "../ComponentesArchivos/Componentes del aside/AsideArchivo.jsx";
import { Outlet } from "react-router-dom";

export default function LayoutConAside() {
  return (
    <div className="flex w-full min-h-screen">
      <AsideArchivo />
      <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
