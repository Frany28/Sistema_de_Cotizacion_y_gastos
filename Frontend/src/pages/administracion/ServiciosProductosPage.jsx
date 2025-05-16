// Frontend/components/ServiciosProductosPage.jsx

import ListaServiciosProductos from "../../components/ServiciosProductosCRUD";

function ServiciosProductosPage() {
  return (
    <>
      <main className="min-h-screen  bg-gray-900 py-4 px-2 sm:px-4">
        <section className="max-w-7xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-white mb-4 md:pl-3 pl-0">
            Lista de Servicios y Productos
          </h1>
          <div className="bg-gray-800 shadow-lg rounded-xl overflow-auto p-4 sm:p-6">
            {/* Tabla de Servicios/Productos */}
            <ListaServiciosProductos />
          </div>
        </section>
      </main>
    </>
  );
}

export default ServiciosProductosPage;
