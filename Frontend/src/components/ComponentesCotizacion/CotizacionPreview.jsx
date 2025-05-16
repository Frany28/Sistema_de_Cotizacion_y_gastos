import React from "react";
import { useNavigate } from "react-router-dom";

export default function CotizacionPreview({ cotizacion }) {
  const navigate = useNavigate();

  const esValida =
    cotizacion &&
    cotizacion.id &&
    cotizacion.cliente_id &&
    cotizacion.detalle?.length > 0 &&
    cotizacion.total > 0;

  if (!esValida) {
    return (
      <div className="p-6 text-center text-white bg-red-600 rounded">
        Esta cotización no tiene todos los campos requeridos para ser
        visualizada.
      </div>
    );
  }

  const url = `http://localhost:3000/api/cotizaciones/${cotizacion.id}/pdf`;

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Vista Previa de Cotización #{cotizacion.id}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Volver
        </button>
      </div>
      <div className="rounded shadow-lg overflow-hidden h-[85vh]">
        <iframe
          src={url}
          title="PDF Cotización"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
