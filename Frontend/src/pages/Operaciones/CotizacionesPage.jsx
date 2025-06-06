import ListaCotizaciones from "../../components/CotizacionesCRUD";

function CotizacionesPage() {
  return (
    <>
      <main className="min-h-screen  bg-gray-900 py-4 px-2 sm:px-4">
        <h1 className="text-2xl font-bold text-white mb-4 md:pl-25 pl-0">
          Lista de Cotizaciones
        </h1>
        <section className="max-w-7xl mx-auto w-full">
          <div className=" bg-gray-800 shadow-lg rounded-xl overflow-auto p-4 sm:p-6">
            <ListaCotizaciones />
          </div>
        </section>
      </main>
    </>
  );
}
export default CotizacionesPage;
