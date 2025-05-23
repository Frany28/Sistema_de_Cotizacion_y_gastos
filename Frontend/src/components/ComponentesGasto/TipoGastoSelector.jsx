import React, { useEffect, useState } from "react";
import api from "../../api/index.js";

const TipoGastoSelector = ({ onSeleccionar, tipoGastoSeleccionado }) => {
  const [tiposGasto, setTiposGasto] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  useEffect(() => {
    const obtenerTiposGasto = async () => {
      try {
        const { data } = await api.get("/registros/tipos-gasto", {
          withCredentials: true,
        });
        setTiposGasto(data);
      } catch (error) {
        console.error("Error al obtener tipos de gasto:", error);
      }
    };
    obtenerTiposGasto();
  }, []);

  const tiposFiltrados = tiposGasto.filter((tipo) =>
    tipo.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSeleccionar = (tipo) => {
    onSeleccionar(tipo);
    setBusqueda(tipo.nombre);
    setMostrarOpciones(false);
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl p-6 shadow-md relative">
      <h4 className="text-white text-md font-semibold mb-3">Tipo de Gasto</h4>

      <input
        type="text"
        placeholder="Buscar tipo de gasto..."
        className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setMostrarOpciones(true);
        }}
        onFocus={() => setMostrarOpciones(true)}
      />

      {mostrarOpciones && tiposFiltrados.length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 mt-1 rounded max-h-48 overflow-y-auto">
          {tiposFiltrados.map((tipo) => (
            <li
              key={tipo.id}
              className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-white"
              onClick={() => handleSeleccionar(tipo)}
            >
              {tipo.nombre}
            </li>
          ))}
        </ul>
      )}

      {tipoGastoSeleccionado && (
        <div className="mt-4 bg-gray-900 p-4 rounded text-gray-300 text-sm">
          <p>
            <strong>Descripción:</strong> {tipoGastoSeleccionado.descripcion}
          </p>
        </div>
      )}
    </div>
  );
};

export default TipoGastoSelector;
