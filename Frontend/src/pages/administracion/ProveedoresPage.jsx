// src/pages/ProveedoresPage.jsx
import React, { useState, useEffect } from "react";
import ListaProveedores from "../../components/ProveedoresCRUD";
import ModalAñadirProveedor from "../../components/Modals/ModalAñadirProveedor";
import api from "../../api/index";

function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // 1) Carga de proveedores usando Axios
  const obtenerProveedores = async () => {
    try {
      const { data } = await api.get("/proveedores");
      // Si tu controlador devuelve { proveedores, total }
      setProveedores(data.proveedores ?? data);
      console.log("✅ Proveedores obtenidos:", data);
    } catch (error) {
      console.error("Error al obtener proveedores:", error);
      alert("Ocurrió un error al obtener la lista de proveedores.");
    }
  };

  useEffect(() => {
    obtenerProveedores();
  }, []);

  // 2) Guardar nuevo proveedor con Axios
  const manejarGuardar = async (nuevoProveedor) => {
    try {
      const { data, status } = await api.post("/proveedores", nuevoProveedor);
      if (status >= 200 && status < 300) {
        alert(" Proveedor registrado exitosamente.");
        console.log(" Proveedor creado:", data);
        await obtenerProveedores();
        setMostrarFormulario(false);
      } else {
        console.error(" Respuesta inesperada:", data);
        alert(" Error al registrar el proveedor.");
      }
    } catch (error) {
      console.error(" Error en la creación del proveedor:", error);
      alert("Error al conectar con el servidor.");
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gray-900 py-4 px-2 sm:px-4">
        <h1 className="text-2xl font-bold text-white mb-4">
          Lista de Proveedores
        </h1>
        <section className="max-w-7xl mx-auto w-full">
          <div className="bg-gray-800 shadow-lg rounded-xl overflow-auto p-4 sm:p-6">
            {/* Botón para mostrar el formulario */}
            <button
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setMostrarFormulario(true)}
            >
              + Añadir Proveedor
            </button>

            {/* Modal para crear proveedor */}
            {mostrarFormulario && (
              <ModalAñadirProveedor
                onGuardar={manejarGuardar}
                onCancel={() => setMostrarFormulario(false)}
              />
            )}

            {/* Tabla de proveedores */}
            <ListaProveedores
              proveedores={proveedores}
              actualizarLista={obtenerProveedores}
            />
          </div>
        </section>
      </main>
    </>
  );
}

export default ProveedoresPage;
