import React, { useState } from "react";
import BotonIcono from "../general/BotonIcono";
import api from "../../api/index";
import ModalError from "../Modals/ModalError";

export default function ServProCotizacion({
  servicios,
  itemsSeleccionados,
  onAgregar,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [modalError, setModalError] = useState({ visible: false, mensaje: "" });

  const filtrar = servicios.filter((s) =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarServicio = async (servicio) => {
    const yaExiste = itemsSeleccionados.find((item) => item.id === servicio.id);
    if (yaExiste) return;

    try {
      const response = await api.get(`/servicios-productos/${servicio.id}`);

      const { stock, tipo, porcentaje_iva } = response.data;

      const nuevo = {
        ...servicio,
        cantidad: 1,
        precio: parseFloat(servicio.precio),
        porcentaje_iva: parseFloat(porcentaje_iva) || 0,
        stockDisponible: tipo === "producto" ? stock : Infinity,
        tipo: tipo,
      };

      if (onAgregar) onAgregar(nuevo);
    } catch (error) {
      console.error("Error al agregar servicio:", error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-md">
      <ModalError
        visible={modalError.visible}
        mensaje={modalError.mensaje}
        onClose={() => setModalError({ visible: false, mensaje: "" })}
      />
      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar servicios o productos..."
          className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrar.map((servicio) => (
              <tr
                key={servicio.id}
                className="bg-gray-800 border-b border-gray-700"
              >
                <td className="px-4 py-2 text-white">{servicio.nombre}</td>
                <td className="px-4 py-2">${servicio.precio}</td>
                <td className="px-4 py-2">
                  <BotonIcono
                    tipo="agregar"
                    onClick={() => agregarServicio(servicio)}
                    titulo="Agregar a cotización"
                  />
                </td>
              </tr>
            ))}
            {filtrar.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-gray-400 py-4">
                  No hay servicios o productos que coincidan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
