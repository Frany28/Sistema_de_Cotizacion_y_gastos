import UsuariosCRUD from "../../components/UsuariosCRUD";

function UsuariosPage() {
  return (
    <>
      <main className="min-h-screen  bg-gray-900 py-4 px-2 sm:px-4">
        <section className="max-w-7xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-white mb-4 md:pl-3 pl-0">
            Lista de Usuarios
          </h1>
          <div className="bg-gray-800 shadow-lg rounded-xl overflow-auto p-4 sm:p-6">
            <UsuariosCRUD />
          </div>
        </section>
      </main>
    </>
  );
}

export default UsuariosPage;
