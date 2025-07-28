import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import Paginacion from "../../general/Paginacion";
import BotonIcono from "../../general/BotonIcono";
import Loader from "../../general/Loader";

const TablaHistorialVersiones = ({ grupoId }) => {
  const [versiones, setVersiones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(5);
  const [cargando, setCargando] = useState(true);
  const [mostrarLoader, setMostrarLoader] = useState(false);

  const navigate = useNavigate();
  useEffect(() => {
    if (mostrarLoader) {
      document.body.classList.add("bloqueo-loader");
    } else {
      document.body.classList.remove("bloqueo-loader");
    }
  }, [mostrarLoader]);

  useEffect(() => {
    const obtenerVersiones = async () => {
      try {
        const res = await api.get(`/archivos/grupo/${grupoId}/versiones`);
        setVersiones(res.data || []);
      } catch (error) {
        console.error("Error al cargar historial de versiones:", error);
      } finally {
        setCargando(false);
      }
    };
    if (grupoId) obtenerVersiones();
  }, [grupoId]);

  const versionesFiltradas = versiones.filter((v) =>
    [v.nombreUsuario, v.nombreOriginal, v.estado]
      .join(" ")
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.ceil(versionesFiltradas.length / limite);
  const versionesPaginadas = versionesFiltradas.slice(
    (pagina - 1) * limite,
    pagina * limite
  );

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatearTamano = (bytes) => {
    if (bytes == null || isNaN(bytes)) return "-";
    const unidades = ["B", "KB", "MB", "GB"];
    let i = 0;
    let valor = bytes;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(1)} ${unidades[i]}`;
  };

  return (
    <div className="mt-10 w-full bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center px-4 py-4 gap-2 border-b border-gray-700">
        <h3 className="text-white text-lg font-semibold">
          Historial de Versiones
        </h3>
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white text-sm"
          />
          <select
            value={limite}
            onChange={(e) => {
              setLimite(Number(e.target.value));
              setPagina(1);
            }}
            className="px-2 py-2 rounded-md bg-gray-700 border border-gray-600 text-white text-sm"
          >
            {[5, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="animate-pulse p-6 space-y-4">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="flex space-x-4">
              {[...Array(7)].map((__, i) => (
                <div
                  key={i}
                  className="h-4 bg-gray-700 rounded w-full max-w-[150px]"
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-400">
              <thead className="bg-gray-700 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Versión</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Tamaño</th>
                  <th className="px-4 py-3 text-left">Archivo</th>
                  <th className="px-4 py-3 text-left">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {versionesPaginadas.map((v) => {
                  const esActiva = v.estado === "activo";
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-gray-700/40 ${
                        esActiva
                          ? "bg-blue-900/30 border-l-4 border-blue-500"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-bold text-white text-center">
                        {v.numeroVersion}
                        {esActiva && (
                          <span className="ml-2 inline-block bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                            Activa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {formatearFecha(v.subidoEn)}
                      </td>
                      <td className="px-4 py-2">{v.nombreUsuario}</td>
                      <td className="px-4 py-2 capitalize">{v.estado}</td>
                      <td className="px-4 py-2">
                        {formatearTamano(v.tamanioBytes)}
                      </td>
                      <td className="px-4 py-2">{v.nombreOriginal}</td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <BotonIcono
                            tipo="ver"
                            titulo="Ver detalle"
                            onClick={() => {
                              localStorage.setItem("loaderActivo", "1");
                              navigate(`/gestor-archivos/archivo/${v.id}`);
                            }}
                          />

                          <BotonIcono
                            tipo="descargar"
                            titulo="Descargar"
                            onClick={() => {
                              setMostrarLoader(true);
                              setTimeout(() => {
                                window.open(v.urlTemporal, "_blank");
                                setMostrarLoader(false);
                              }, 1000);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {versionesPaginadas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-500">
                      No hay resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Paginacion
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      {mostrarLoader && (
        <div
          id="loader-overlay"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center bloqueo-loader"
        >
          <Loader />
        </div>
      )}
    </div>
  );
};

export default TablaHistorialVersiones;
