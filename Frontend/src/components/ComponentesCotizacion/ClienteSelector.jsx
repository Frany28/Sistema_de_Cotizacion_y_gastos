import React, { useState } from "react";
import ModalAñadirCliente from "../Modals/ModalAñadirCliente";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";

const ClienteSelector = ({
  clientes,
  onClienteSeleccionado,
  mostrarError = false,
  setClientes,
}) => {
  const [clienteId, setClienteId] = useState("");
  const [datosCliente, setDatosCliente] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalExito, setModalExito] = useState(null);
  const [modalError, setModalError] = useState(null);

  const manejarSeleccion = (id) => {
    setClienteId(id);
    const cliente = clientes.find((c) => c.id === parseInt(id));
    setDatosCliente(cliente || null);
    if (cliente) onClienteSeleccionado(cliente);
  };

  const añadirCliente = (nuevoCliente) => {
    setClientes((prev) => [...prev, nuevoCliente]);
    setClienteId(nuevoCliente.id);
    setDatosCliente(nuevoCliente);
    if (typeof onClienteSeleccionado === "function") {
      onClienteSeleccionado(nuevoCliente.id);
    }
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-white">
          Cliente *
        </label>
        <button
          onClick={() => setMostrarModal(true)}
          className="text-blue-400 hover:text-blue-600 text-sm underline cursor-pointer"
        >
          + Añadir Cliente
        </button>
      </div>

      <select
        value={clienteId}
        onChange={(e) => manejarSeleccion(e.target.value)}
        className="cursor-pointer bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
        required
      >
        <option value="">Seleccione un cliente</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.codigo_referencia ?? cliente.nombre}
          </option>
        ))}
      </select>

      {mostrarError && !clienteId && (
        <div className="mt-2 p-2 bg-red-200 text-red-800 rounded">
          Debe seleccionar un cliente
        </div>
      )}

      {datosCliente && (
        <div className="mt-4 p-6 bg-gray-800 rounded-xl shadow-md text-white grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-bold mb-1">Código de referencia</p>
            <p className="text-s text-gray-400">
              {datosCliente.codigo_referencia}
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">Nombre del cliente</p>
            <p className="text-s text-gray-400">{datosCliente.nombre}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Cédula / Pasaporte</p>
            <p className="text-s text-gray-400">
              {datosCliente.identificacion}
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">Correo electronico</p>
            <p className="text-s text-gray-400">{datosCliente.email}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Teléfono</p>
            <p className="text-s text-gray-400">{datosCliente.telefono}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Dirección</p>
            <p className="text-s text-gray-400">{datosCliente.direccion}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Sucursal</p>
            <p className="text-s text-gray-400">
              {datosCliente.sucursal_nombre ?? "—"}
            </p>
          </div>
        </div>
      )}

      {mostrarModal && (
        <ModalAñadirCliente
          onCancel={() => setMostrarModal(false)}
          onSubmit={añadirCliente}
          onSuccess={setModalExito}
        />
      )}

      <ModalExito
        visible={!!modalExito}
        onClose={() => setModalExito(null)}
        {...modalExito}
      />

      <ModalError
        visible={!!modalError}
        onClose={() => setModalError(null)}
        {...modalError}
      />
    </div>
  );
};

export default ClienteSelector;
