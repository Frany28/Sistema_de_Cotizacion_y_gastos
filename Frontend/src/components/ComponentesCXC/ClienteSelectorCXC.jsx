import React, { useState, useEffect } from "react";
import axios from "axios";

const ClienteSelectorCXC = ({ onClienteSeleccionado }) => {
  const [clientes, setClientes] = useState([]);
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState("");

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/cuentas-por-cobrar/clientes"
        );
        setClientes(response.data);
      } catch (error) {
        console.error("Error al cargar clientes con CXC:", error);
      }
    };

    fetchClientes();
  }, []);

  const manejarCambio = (e) => {
    const id = e.target.value;
    setClienteIdSeleccionado(id);
    onClienteSeleccionado(id);
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl p-4 shadow-md">
      <label className="block text-sm font-medium text-white mb-2">
        Seleccionar Cliente por Código
      </label>
      <select
        value={clienteIdSeleccionado}
        onChange={manejarCambio}
        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
      >
        <option value="">Seleccione un cliente</option>
        {Array.isArray(clientes) && clientes.length > 0 ? (
          clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.codigo_referencia} - {cliente.nombre}
            </option>
          ))
        ) : (
          <option disabled>No hay clientes con cuentas por cobrar</option>
        )}
      </select>
    </div>
  );
};

export default ClienteSelectorCXC;
