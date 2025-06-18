import React, { useState } from "react";
import ModalAñadirProveedor from "../Modals/ModalAñadirProveedor";
import ModalExito from "../Modals/ModalExito";
import ModalError from "../Modals/ModalError";

const ProveedorSelector = ({
  proveedores = [],
  proveedorSeleccionado,
  onSeleccionar,
  setProveedores,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalExito, setModalExito] = useState(null);
  const [modalError, setModalError] = useState(null);

  const filtrarProveedores = () => {
    if (!Array.isArray(proveedores)) return [];
    return proveedores.filter(
      (p) =>
        p.rif.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const handleSeleccionar = (proveedor) => {
    onSeleccionar(proveedor);
    setBusqueda(proveedor.rif + " - " + proveedor.nombre);
    setMostrarOpciones(false);
  };

  const añadirProveedor = (nuevoProveedor) => {
    setProveedores((prev) => [...prev, nuevoProveedor]);
    onSeleccionar(nuevoProveedor);
    setBusqueda(nuevoProveedor.rif + " - " + nuevoProveedor.nombre);
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl shadow-md p-6 relative">
      <div className="flex justify-between items-center mb-3">
        <label className="block text-sm font-medium text-white">
          Proveedor *
        </label>
        <button
          onClick={() => setMostrarModal(true)}
          className="text-blue-400 hover:text-blue-600 text-sm underline cursor-pointer"
        >
          + Añadir Proveedor
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por RIF o nombre..."
        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setMostrarOpciones(true);
        }}
        onFocus={() => setMostrarOpciones(true)}
      />

      {mostrarOpciones && filtrarProveedores().length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 mt-1 rounded max-h-48 overflow-y-auto">
          {filtrarProveedores().map((p) => (
            <li
              key={p.id}
              className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-white"
              onClick={() => handleSeleccionar(p)}
            >
              {p.rif} - {p.nombre}
            </li>
          ))}
        </ul>
      )}

      {proveedorSeleccionado && (
        <div className="mt-4 p-6 bg-gray-900 rounded-xl shadow-inner text-white grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-bold mb-1">Nombre</p>
            <p className="text-gray-300">{proveedorSeleccionado.nombre}</p>
          </div>
          <div>
            <p className="font-bold mb-1">RIF</p>
            <p className="text-gray-300">{proveedorSeleccionado.rif}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Teléfono</p>
            <p className="text-gray-300">{proveedorSeleccionado.telefono}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Dirección</p>
            <p className="text-gray-300">{proveedorSeleccionado.direccion}</p>
          </div>
        </div>
      )}

      {mostrarModal && (
        <ModalAñadirProveedor
          onCancel={() => setMostrarModal(false)}
          onSubmit={añadirProveedor}
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

export default ProveedorSelector;
