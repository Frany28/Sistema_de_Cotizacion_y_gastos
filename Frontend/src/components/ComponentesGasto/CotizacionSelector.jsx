import React, { useState, useEffect } from "react";

const CotizacionSelector = ({
  cotizaciones = [],
  cotizacionSeleccionada,
  onSeleccionar,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  useEffect(() => {
  }, [cotizaciones]);

  const filtrarCotizaciones = () => {
    if (!Array.isArray(cotizaciones)) return [];
    return cotizaciones.filter(
      (c) =>
        c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const handleSeleccionar = (cotizacion) => {
    onSeleccionar(cotizacion);
    setBusqueda(`${cotizacion.codigo} - ${cotizacion.cliente_nombre}`);
    setMostrarOpciones(false);
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl shadow-md p-6 relative">
      <div className="flex justify-between items-center mb-3">
        <label className="block text-sm font-medium text-white">
          Cotización *
        </label>
      </div>

      <input
        type="text"
        placeholder="Buscar por código o cliente..."
        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setMostrarOpciones(true);
        }}
        onFocus={() => setMostrarOpciones(true)}
      />

      {mostrarOpciones && filtrarCotizaciones().length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 mt-1 rounded max-h-48 overflow-y-auto">
          {filtrarCotizaciones().map((c) => (
            <li
              key={c.id}
              className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-white"
              onClick={() => handleSeleccionar(c)}
            >
              {c.codigo} - {c.cliente_nombre}
            </li>
          ))}
        </ul>
      )}

      {cotizacionSeleccionada && (
        <div className="mt-4 p-6 bg-gray-900 rounded-xl shadow-inner text-white grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-bold mb-1">Código</p>
            <p className="text-gray-300">{cotizacionSeleccionada.codigo}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Cliente</p>
            <p className="text-gray-300">
              {cotizacionSeleccionada.cliente_nombre}
            </p>
          </div>
          <div>
            <p className="font-bold mb-1">Fecha</p>
            <p className="text-gray-300">{cotizacionSeleccionada.fecha}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Total</p>
            <p className="text-gray-300">
              {cotizacionSeleccionada.moneda === "VES" ? "Bs" : "$"}{" "}
              {parseFloat(cotizacionSeleccionada.total).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionSelector;
