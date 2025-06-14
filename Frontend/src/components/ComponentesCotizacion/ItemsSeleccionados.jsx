import React from "react";
import BotonIcono from "../general/BotonIcono";
import { Plus, Minus } from "lucide-react";

export default function ItemsSeleccionados({ items = [], onUpdate, onRemove }) {
  const handleChangeCantidad = (id, nuevaCantidad) => {
    const actualizado = items.map((item) => {
      if (item.id === id) {
        const max = item.stockDisponible || Infinity;
        const cantidad = Math.max(1, Math.min(nuevaCantidad, max));
        return { ...item, cantidad };
      }
      return item;
    });
    onUpdate(actualizado);
  };

  const handleChangePrecio = (id, valor) => {
    const nuevoPrecio = parseFloat(valor);
    const actualizado = items.map((item) =>
      item.id === id
        ? { ...item, precio: isNaN(nuevoPrecio) ? 0 : nuevoPrecio }
        : item
    );
    onUpdate(actualizado);
  };

  return (
    <div className="mb-6 bg-gray-800 rounded-xl p-6 shadow-md">
      <h4 className="text-white text-md font-semibold mb-2">
        Servicios / Productos Seleccionados
      </h4>
      <div className="overflow-x-auto rounded">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase bg-gray-700">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Precio Unitario</th>
              <th className="px-3 py-2">IVA %</th>
              <th className="px-3 py-2">Subtotal</th>
              <th className="px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="bg-gray-800 border-b border-gray-700"
              >
                <td className="px-3 py-2 text-white">{item.nombre}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleChangeCantidad(item.id, item.cantidad - 1)
                      }
                      className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                      disabled={item.cantidad <= 1}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-2 min-w-[24px] text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() =>
                        handleChangeCantidad(item.id, item.cantidad + 1)
                      }
                      className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                      disabled={
                        item.stockDisponible &&
                        item.cantidad >= item.stockDisponible
                      }
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.precio}
                    min="0"
                    step="0.01"
                    onChange={(e) =>
                      handleChangePrecio(item.id, e.target.value)
                    }
                    className="w-20 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white"
                  />
                </td>
                <td className="px-3 py-2">
                  {item.porcentaje_iva ?? 0}%{" "}
                </td>
                <td className="px-3 py-2">
                  ${((item.precio || 0) * item.cantidad).toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <BotonIcono
                    tipo="eliminar"
                    onClick={() => onRemove(item.id)}
                    titulo="Eliminar"
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-gray-400 py-4">
                  No hay servicios ni productos seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
