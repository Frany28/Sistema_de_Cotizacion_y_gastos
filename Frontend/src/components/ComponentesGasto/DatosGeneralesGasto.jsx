import React from "react";

const DatosBasicosGasto = ({ gasto, setGasto, sucursales = [] }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setGasto((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    // Guardamos en el estado de "gasto" la propiedad "comprobante"
    setGasto((prev) => ({ ...prev, comprobante: file }));
  };

  // Aseguramos que sucursales sea siempre un array
  const opcionesSucursales = Array.isArray(sucursales) ? sucursales : [];

  return (
    <div className="grid grid-cols-1 gap-6 bg-gray-800 p-6 rounded-xl shadow-md text-white">
      <div>
        <label className="text-sm mb-1 block text-white">
          Concepto del Gasto
        </label>
        <input
          type="text"
          name="concepto_pago"
          value={gasto.concepto_pago || ""}
          onChange={handleChange}
          placeholder="Ej: Servicios generales"
          className="w-full p-2 rounded bg-gray-700 border border-gray-600"
        />
      </div>

      <div>
        <label className="text-sm mb-1 block text-white">Fecha del Gasto</label>
        <input
          type="date"
          name="fecha"
          value={gasto.fecha || new Date().toISOString().split("T")[0]}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
        />
      </div>

      <div>
        <label className="text-sm mb-1 block text-white">Sucursal</label>
        <select
          name="sucursal_id"
          value={gasto.sucursal_id || ""}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
        >
          <option value="">Seleccione una sucursal</option>
          {opcionesSucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className="text-sm mb-1 block text-white">Descripción</label>
        <textarea
          name="descripcion"
          value={gasto.descripcion || ""}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white"
          placeholder="Detalle adicional del gasto..."
          rows={3}
        />
      </div>
      <div className="col-span-1">
        <label className="block mb-1 text-sm font-medium text-white">
          Comprobante (imagen o PDF)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          name="comprobante"
          onChange={handleFileChange}
          className="
            block w-full p-2.5 text-gray-200 rounded
            file:px-4 file:py-2
            file:bg-gray-600 file:text-gray-200
            file:border file:border-gray-500
            file:rounded file:cursor-pointer
            file:hover:bg-gray-500
            transition duration-200 ease-in-out
          "
        />
      </div>
    </div>
  );
};

export default DatosBasicosGasto;
