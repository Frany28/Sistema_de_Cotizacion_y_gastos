import React, { useState } from "react";
import ModalAñadirCliente from "../Modals/ModalAñadirCliente";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";

const ClienteSelector = ({
  clientes,
  onClienteSeleccionado,
  mostrarError = false,
  setClientes,
  añadirCliente,
}) => {
  const [clienteId, setClienteId] = useState("");
  const [datosCliente, setDatosCliente] = useState(null);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalExito, setModalExito] = useState(null);
  const [modalError, setModalError] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const manejarSeleccionCliente = (cliente) => {
    setClienteId(cliente.id);
    setDatosCliente(cliente);
    setBusqueda(
      (cliente.codigo_referencia ? cliente.codigo_referencia + " - " : "") +
        cliente.nombre
    );
    setMostrarOpciones(false);
    if (typeof onClienteSeleccionado === "function") {
      onClienteSeleccionado(cliente);
    }
  };

  const filtrarClientes = () => {
    if (!Array.isArray(clientes)) return [];
    return clientes.filter((c) => {
      return (
        (c.codigo_referencia ?? "")
          .toLowerCase()
          .includes(busqueda.toLowerCase()) ||
        (c.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
      );
    });
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-2 md:gap-0">
        <label className="block text-sm font-medium text-white">
          Cliente *
        </label>
        <button
          onClick={() => setMostrarModal(true)}
          className="text-blue-400 hover:text-blue-600 text-sm underline cursor-pointer text-left md:text-right"
        >
          + Añadir Cliente
        </button>
      </div>

      <div className="relative w-full">
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setMostrarOpciones(true);
          }}
          onFocus={() => setMostrarOpciones(true)}
          onBlur={() => setTimeout(() => setMostrarOpciones(false), 200)}
        />

        {mostrarOpciones && filtrarClientes().length > 0 && (
          <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
            {filtrarClientes().map((c) => (
              <li
                key={c.id}
                className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-white text-sm md:text-base"
                onClick={() => manejarSeleccionCliente(c)}
              >
                {(c.codigo_referencia ? c.codigo_referencia + " - " : "") +
                  c.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>

      {mostrarError && !clienteId && (
        <div className="mt-2 p-2 bg-red-200 text-red-800 rounded text-sm">
          Debe seleccionar un cliente
        </div>
      )}

      {datosCliente && (
        <div className="mt-4 p-4 md:p-6 bg-gray-700 rounded-xl shadow-md text-white grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="break-words">
            <p className="font-bold mb-1 text-sm md:text-base">
              Código de referencia
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.codigo_referencia || "—"}
            </p>
          </div>
          <div className="break-words">
            <p className="font-bold mb-1 text-sm md:text-base">
              Nombre del cliente
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.nombre}
            </p>
          </div>
          <div className="break-words">
            <p className="font-bold mb-1 text-sm md:text-base">
              Cédula / Pasaporte
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.identificacion || "—"}
            </p>
          </div>
          <div className="break-words">
            <p className="font-bold mb-1 text-sm md:text-base">
              Correo electrónico
            </p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.email || "—"}
            </p>
          </div>
          <div className="break-words">
            <p className="font-bold mb-1 text-sm md:text-base">Teléfono</p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.telefono || "—"}
            </p>
          </div>
          <div className="break-words sm:col-span-2">
            <p className="font-bold mb-1 text-sm md:text-base">Dirección</p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.direccion || "—"}
            </p>
          </div>
          <div className="break-words">
            <p className="font-bold mb-1 text-sm md:text-base">Sucursal</p>
            <p className="text-xs md:text-sm text-gray-400">
              {datosCliente.sucursal_nombre || "—"}
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
