import React from "react";
import ClientesPage from "./ClientesPage";
import ServiciosProductosPage from "./ServiciosProductosPage";
import ProveedoresPage from "./ProveedoresPage";

/**
 * @description Sidebar items para la sección de administración
 * @type {Array<{ path: string, label: string }>}
 * @property {string} path - La ruta del sidebar item
 * @property {string} label - El texto del sidebar item
 * @description Este array contiene los items del sidebar para la sección de administración.
 * @description Cada objeto en el array representa un item del sidebar con su respectiva ruta y etiqueta.
 */

const ClientesSidebarItems = [
  { path: "/administracion/clientes", label: "Clientes" },
  { path: "/administracion/Servicios-productos", label: "Servicios/Productos" },
  { path: "/administracion/proveedores", label: "Proveedores" },
];

function administracion() {
  return (
    <>
        <ClientesPage />
        <ServiciosProductosPage />
        <ProveedoresPage />
    </>
  );
}

export default administracion;
