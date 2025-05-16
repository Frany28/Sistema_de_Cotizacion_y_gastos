import React from "react";
import Sidebar from "../../components/general/Sidebar";
import CotizacionesPage from "./CotizacionesPage";

const OperacionesSidebarItems = [
  { path: "/operaciones/cotizaciones", label: "Cotizaciones" },
  { path: "/operaciones/gastos", label: "Gastos" },
  { path: "/operaciones/solicitudes", label: "Solicitudes" },
];

function Operaciones() {
  return (
    <>
      <Sidebar items={OperacionesSidebarItems}>
        <CotizacionesPage />
      </Sidebar>
    </>
  );
}

export default Operaciones;
