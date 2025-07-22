// src/components/ComponentesArchivos/HistorialVersionesArchivo.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api";
import { formatearFecha } from "../../../utils/formatearFecha";
import { Input } from "../../ui/input";

const HistorialVersionesArchivo = () => {
  const { id, grupoId } = useParams(); // puede venir desde archivoId o grupoArchivoId
  const [versiones, setVersiones] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const obtenerVersiones = async () => {
      try {
        const endpoint = grupoId
          ? `/archivos/grupo/${grupoId}/versiones`
          : `/archivos/${id}/versiones`;

        const res = await api.get(endpoint);
        setVersiones(res.data || []);
      } catch (error) {
        console.error("Error al obtener historial de versiones:", error);
      }
    };

    obtenerVersiones();
  }, [id, grupoId]);

  const versionesFiltradas = versiones.filter((v) =>
    [v.nombreUsuario, v.nombreOriginal, v.estado]
      .join(" ")
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-white">Historial de Versiones</h1>
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="w-64 bg-gray-700 border border-gray-600 text-white"
        />
      </div>

      <div className="overflow-x-auto border border-gray-700 rounded-xl">
        <table className="min-w-full divide-y divide-gray-600 bg-gray-800 text-sm text-white">
          <thead>
            <tr className="bg-gray-700 text-gray-300">
              <th className="px-4 py-2 text-left">Versión</th>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Usuario</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Tamaño</th>
              <th className="px-4 py-2 text-left">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {versionesFiltradas.length > 0 ? (
              versionesFiltradas.map((v) => (
                <tr key={v.id} className="hover:bg-gray-700 transition">
                  <td className="px-4 py-2">v{v.numeroVersion}</td>
                  <td className="px-4 py-2">{v.nombreOriginal}</td>
                  <td className="px-4 py-2">{v.nombreUsuario}</td>
                  <td className="px-4 py-2 capitalize">{v.estado}</td>
                  <td className="px-4 py-2">{formatearFecha(v.subidoEn)}</td>
                  <td className="px-4 py-2">
                    {(v.tamanioBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={v.urlTemporal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-xs"
                    >
                      Descargar
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="text-center text-gray-500 py-10 text-sm"
                >
                  No hay versiones para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistorialVersionesArchivo;
