import Sidebar from "../../components/general/Sidebar";

const CotizacionSidebarItems = [
  { path: "/Operaciones/DetalleCotizacion", label: "Cotizaciones" },
  { path: "/Operaciones/gastos/Listagastos", label: "Gastos" },
  { path: "/Operaciones/solicitudes/DetalleSolicitud", label: "Proveedores" },
];

function DetalleCotizacion() {
  return (
    <>
      <Sidebar items={CotizacionSidebarItems} />
      
      <h1>Pagina de Detalle de Cotizacion</h1>
    </>
  );
}

export default DetalleCotizacion;
