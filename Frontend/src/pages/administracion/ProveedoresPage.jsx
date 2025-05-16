import React, { useState, useEffect } from "react";
import ListaProveedores from "../../components/ProveedoresCRUD";

function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Obtener proveedores
  const obtenerProveedores = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/proveedores");
      const data = await res.json();
      console.log("✅ Proveedores obtenidos: ", data);
      setProveedores(data);
    } catch (error) {
      console.error("❌ Error al obtener proveedores:", error);
      alert("Ocurrió un error al obtener la lista de proveedores.");
    }
  };

  useEffect(() => {
    obtenerProveedores();
  }, []);

  // Guardar proveedor
  const manejarGuardar = async (nuevoProveedor) => {
    try {
      const res = await fetch("http://localhost:3000/api/proveedores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nuevoProveedor),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Proveedor registrado exitosamente.");
        console.log("✅ Proveedor creado:", data);
        obtenerProveedores();
        setMostrarFormulario(false);
      } else {
        alert("⚠️ Error al registrar el proveedor.");
        console.error("❌ Respuesta del servidor:", data);
      }
    } catch (error) {
      alert("❌ Error al conectar con el servidor.");
      console.error("❌ Error en la creación del proveedor:", error);
    }
  };

  return (
    <>
      <main className=" min-h-screen  bg-gray-900 py-4 px-2 sm:px-4">
        <h1 className="text-2xl font-bold text-white mb-4 md:pl-24 pl-0">
          Lista de Proveedores
        </h1>
        <section className="max-w-7xl mx-auto w-full">
          <div className=" bg-gray-800 shadow-lg rounded-xl overflow-auto p-4 sm:p-6">
            {/* Modal crear proveedor */}
            {mostrarFormulario && (
              <ModalAñadirProveedor
                onClose={() => setMostrarFormulario(false)}
                onGuardar={manejarGuardar}
                onCancel={() => setMostrarFormulario(false)}
              />
            )}

            {/* Tabla de Proveedores */}
            <ListaProveedores
              proveedores={proveedores}
              obtenerProveedores={obtenerProveedores}
            />
          </div>
        </section>
      </main>
    </>
  );
}

export default ProveedoresPage;
