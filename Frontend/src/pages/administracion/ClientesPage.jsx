import React, { useEffect, useState } from "react";
import ModalEditar from "../../components/Modals/ModalEditar";
import ModalExito from "../../components/Modals/ModalExito";
import ListaClientes from "../../components/ClientesCRUD";
import api from "../../api/index";

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModalExito, setMostrarModalExito] = useState(false);

  const camposCliente = [
    { name: "nombre", label: "Nombre", placeholder: "Nombre del cliente" },
    { name: "email", label: "Email", type: "email" },
    { name: "telefono", label: "Teléfono", placeholder: "Ej. 04141234567" },
    { name: "direccion", label: "Dirección" },
  ];

  // ClientesPage.jsx
  const obtenerClientes = async () => {
    try {
      const { data } = await api.get("/clientes");
      setClientes(data);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      alert("Ocurrió un error al obtener la lista de clientes.");
    }
  };

  const handleEditar = (cliente) => {
    setClienteEditando(cliente);
    setMostrarModalEditar(true);
  };

  const handleGuardarEdicion = async (datosActualizados) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clientes/${clienteEditando.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosActualizados),
        }
      );

      if (res.ok) {
        await obtenerClientes();
        setMostrarModalEditar(false);
        setMostrarModalExito(true);
      } else {
        console.error("Error al actualizar cliente");
      }
    } catch (error) {
      console.error("Error al guardar edición:", error);
    }
  };

  const cerrarModalExito = () => {
    setMostrarModalExito(false);
  };

  useEffect(() => {
    obtenerClientes();
  }, []);

  return (
    <>
      <main className="min-h-screen  bg-gray-900 py-4 px-2 sm:px-4">
        <section className="max-w-7xl mx-auto w-full">
          <h1 className="text-2xl font-bold text-white mb-4 md:pl-25 pl-0">
            Lista de Clientes
          </h1>
          <div className=" bg-gray-800 shadow-lg rounded-xl overflow-auto p-4 sm:p-6">
            <ListaClientes clientes={clientes} onEditar={handleEditar} />
          </div>
        </section>
      </main>

      {/* Modal para editar cliente */}
      {mostrarModalEditar && (
        <ModalEditar
          titulo="Editar Cliente"
          campos={camposCliente}
          datosIniciales={clienteEditando}
          onSubmit={handleGuardarEdicion}
          onCancel={() => setMostrarModalEditar(false)}
        />
      )}

      {/* Modal de éxito */}
      {mostrarModalExito && (
        <ModalExito
          mensaje="Cliente actualizado exitosamente"
          onClose={cerrarModalExito}
        />
      )}
    </>
  );
}

export default ClientesPage;
