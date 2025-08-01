// src/components/ListaSolicitudesPago.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../api/index";
import BotonIcono from "./general/BotonIcono";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";
import ModalVerSolicitudDePago from "../components/Modals/ModalVerSolicitudDePago";
import ModalRegistrarPago from "../components/Modals/ModalRegistrarPago";
import Paginacion from "../components/general/Paginacion";
import Loader from "./general/Loader";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront";
api.defaults.baseURL = import.meta.env.VITE_API_URL;

function ListaSolicitudesPago() {
  // Estados principales
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [todasSolicitudes, setTodasSolicitudes] = useState([]);
  const [puedePagar, setPuedePagar] = useState(false);

  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("solicitudesLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/solicitudes-pago", {
        params: {
          page: 1,
          limit: 9999, // trae todas
          estado: estadoFiltro !== "todos" ? estadoFiltro : undefined,
        },
        withCredentials: true,
      });

      const todas = Array.isArray(response.data?.solicitudes)
        ? response.data.solicitudes
        : [];

      setTodasSolicitudes(todas);
      setTotalSolicitudes(todas.length);
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
      mostrarError({
        titulo: "Error al obtener las solicitudes",
        mensaje: "No se pudieron cargar los datos desde la base de datos.",
      });
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  useEffect(() => {
    (async () => {
      try {
        const tiene = await verificarPermisoFront("pagarSolicitudPago");
        setPuedePagar(tiene);
      } catch (err) {
        console.error("Error verificando permiso:", err);
      }
    })();
  }, []);

  const solicitudesFiltradas = todasSolicitudes.filter((s) =>
    [s.codigo, s.proveedor_nombre, s.estado, s.moneda].some((campo) =>
      campo?.toString().toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  // Estados para modales
  const [pagarData, setPagarData] = useState({
    visible: false,
    solicitudId: null,
  });

  const [verSolicitudData, setVerSolicitudData] = useState({
    visible: false,
    solicitud: null,
  });

  const fetchSolicitudDetallada = async (id) => {
    const { data } = await api.get(`/solicitudes-pago/${id}`, {
      withCredentials: true,
    });
    return data; // ← contiene monto_total, tasa_cambio, banco_nombre...
  };

  // Estados para modales de feedback
  const [modalExitoData, setModalExitoData] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    textoBoton: "Entendido",
  });

  const [modalErrorData, setModalErrorData] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    textoBoton: "Cerrar",
  });

  const mostrarError = ({ titulo, mensaje, textoBoton = "Cerrar" }) => {
    setModalErrorData({ visible: true, titulo, mensaje, textoBoton });
  };

  // Carga inicial de datos
  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // Manejo de búsqueda
  const manejarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPage(1);
  };

  const cambiarLimite = (nuevoLimite) => {
    setLimit(nuevoLimite);
    localStorage.setItem("solicitudesLimit", nuevoLimite);
    setPage(1);
  };

  // Filtrado y paginación
  const totalPaginas = Math.ceil(solicitudesFiltradas.length / limit);

  const solicitudesPaginadas = solicitudesFiltradas.slice(
    (page - 1) * limit,
    page * limit
  );

  const onPagoExitoso = () => {
    setPagarData({ visible: false, solicitudId: null });
    fetchSolicitudes();
  };

  const handleAgregarPago = (solicitud) => {
    if (solicitud.estado !== "por_pagar") {
      mostrarError({
        titulo: "Solicitud no disponible",
        mensaje:
          "Esta solicitud ya fue pagada o cancelada y no se puede registrar un nuevo pago.",
      });
      return;
    }
    setPagarData({ visible: true, solicitudId: solicitud.id });
  };

  const handleVerSolicitud = async (solicitudFila) => {
    try {
      const solicitudCompleta = await fetchSolicitudDetallada(solicitudFila.id);
      setVerSolicitudData({
        visible: true,
        solicitud: solicitudCompleta,
      });
    } catch (err) {
      console.error(err);
      mostrarError({
        titulo: "Error al obtener la solicitud",
        mensaje:
          "No se pudo cargar la información completa. Intenta nuevamente.",
      });
    }
  };

  // Renderizado condicional
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  return (
    <div>
      {/* Controles de búsqueda y filtrado */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 p-4 gap-2">
        <div className="flex w-full md:w-1/2 gap-2">
          {/* Selector de cantidad */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="cantidad"
              className="text-sm text-gray-300 font-medium"
            >
              Mostrar:
            </label>
            <select
              id="cantidad"
              value={limit}
              onChange={(e) => cambiarLimite(Number(e.target.value))}
              className="text-sm rounded-md border-gray-600 bg-gray-700 text-white"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
          </div>

          {/* Barra de búsqueda */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              id="busqueda-simple"
              placeholder="Buscar..."
              value={busqueda}
              onChange={manejarBusqueda}
              className="pl-10 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 mb-2">
          {[
            { id: "todos", nombre: "Todos" },
            { id: "por_pagar", nombre: "Por pagar" },
            { id: "pagada", nombre: "Pagadas" },
          ].map((estado) => (
            <button
              key={estado.id}
              onClick={() => {
                setEstadoFiltro(estado.id);
                setPage(1);
              }}
              className={`px-4 py-1 rounded-full text-sm border ${
                estadoFiltro === estado.id
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800 text-white hover:bg-gray-500"
              }`}
            >
              {estado.nombre}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-400">
          Mostrando {solicitudesPaginadas.length} de{" "}
          {solicitudesFiltradas.length} resultados
        </div>
      </div>

      {/* Vista de tabla para pantallas grandes */}
      <div className="hidden lg:block">
        <table className="w-full text-sm text-left text-gray-400">
          {/* Encabezados de tabla */}
          <thead className="text-xs uppercase bg-gray-700 text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Moneda</th>
              <th className="px-4 py-3">Monto Total</th>
              <th className="px-4 py-3">Monto Pagado</th>
              <th className="px-4 py-3">Saldo Pendiente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>

          {/* Cuerpo de tabla */}
          <tbody>
            {solicitudesPaginadas.map((solicitud) => {
              const saldoPendiente = solicitud.monto - solicitud.pagado;
              const isBolivares = solicitud.moneda === "VES";

              return (
                <tr key={solicitud.id} className="border-b border-gray-700">
                  <td className="px-5 py-3 font-medium text-white">
                    {solicitud.codigo}
                  </td>
                  <td className="px-5 py-3">
                    {new Date(solicitud.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3">{solicitud.moneda}</td>
                  <td className="px-5 py-3">
                    {isBolivares
                      ? `${parseFloat(solicitud.monto).toFixed(2)} BS`
                      : `$${parseFloat(solicitud.monto).toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3">
                    {isBolivares
                      ? `${parseFloat(solicitud.pagado).toFixed(2)} BS`
                      : `$${parseFloat(solicitud.pagado).toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3">
                    {isBolivares
                      ? `${saldoPendiente.toFixed(2)} BS`
                      : `$${saldoPendiente.toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        solicitud.estado === "por_pagar"
                          ? "bg-yellow-100 text-yellow-800"
                          : solicitud.estado === "pagada"
                          ? "bg-green-100 text-green-800"
                          : solicitud.estado === "cancelada" ||
                            solicitud.estado === "rechazada"
                          ? "bg-red-100 text-red-800"
                          : ""
                      }`}
                    >
                      {solicitud.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex space-x-2 items-center">
                    <BotonIcono
                      tipo="ver"
                      onClick={() => handleVerSolicitud(solicitud)}
                      titulo="Ver solicitud"
                    />

                    {puedePagar && (
                      <BotonIcono
                        tipo="abonar"
                        onClick={() => handleAgregarPago(solicitud)}
                        disabled={solicitud.estado !== "por_pagar"}
                        className={`${
                          solicitud.estado !== "por_pagar"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        titulo="Agregar pago"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas para tablets */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-1 gap-4 p-2">
          {solicitudesPaginadas.map((solicitud) => {
            const saldoPendiente = solicitud.monto - solicitud.pagado;
            const isBolivares = solicitud.moneda === "VES";

            return (
              <div
                key={solicitud.id}
                className="bg-gray-800 rounded-lg p-4 shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-white">
                      {solicitud.codigo}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(solicitud.fecha).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      solicitud.estado === "por_pagar"
                        ? "bg-yellow-100 text-yellow-800"
                        : solicitud.estado === "pagada"
                        ? "bg-green-100 text-green-800"
                        : solicitud.estado === "cancelada" ||
                          solicitud.estado === "rechazada"
                        ? "bg-red-100 text-red-800"
                        : ""
                    }`}
                  >
                    {solicitud.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <span className="text-gray-400">Moneda:</span>
                    <span className="text-white ml-1">{solicitud.moneda}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total:</span>
                    <span className="text-white ml-1">
                      {isBolivares
                        ? `${parseFloat(solicitud.monto).toFixed(2)} BS`
                        : `$${parseFloat(solicitud.monto).toFixed(2)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Pagado:</span>
                    <span className="text-white ml-1">
                      {isBolivares
                        ? `${parseFloat(solicitud.pagado).toFixed(2)} BS`
                        : `$${parseFloat(solicitud.pagado).toFixed(2)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Saldo:</span>
                    <span className="text-white ml-1">
                      {isBolivares
                        ? `${saldoPendiente.toFixed(2)} BS`
                        : `$${saldoPendiente.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-3">
                  <BotonIcono
                    tipo="ver"
                    titulo="Ver solicitud"
                    small
                    onClick={() => handleVerSolicitud(solicitud)}
                  />

                  {puedePagar && (
                    <BotonIcono
                      tipo="abonar"
                      onClick={() => handleAgregarPago(solicitud)}
                      disabled={solicitud.estado !== "por_pagar"}
                      small
                      className={`${
                        solicitud.estado !== "por_pagar"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      titulo="Agregar pago"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vista de tarjetas compactas para móviles */}
      <div className="md:hidden space-y-3 p-2">
        {solicitudesPaginadas.map((solicitud) => {
          const saldoPendiente = solicitud.monto - solicitud.pagado;
          const isBolivares = solicitud.moneda === "VES";

          return (
            <div
              key={solicitud.id}
              className="bg-gray-800 rounded-lg p-4 shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white">{solicitud.codigo}</h3>
                  <p className="text-sm text-gray-400">
                    {new Date(solicitud.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    solicitud.estado === "por_pagar"
                      ? "bg-yellow-100 text-yellow-800"
                      : solicitud.estado === "pagada"
                      ? "bg-green-100 text-green-800"
                      : solicitud.estado === "cancelada" ||
                        solicitud.estado === "rechazada"
                      ? "bg-red-100 text-red-800"
                      : ""
                  }`}
                >
                  {solicitud.estado}
                </span>
              </div>

              <div className="mt-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-700">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white">
                    {isBolivares
                      ? `${parseFloat(solicitud.monto).toFixed(2)} BS`
                      : `$${parseFloat(solicitud.monto).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-700">
                  <span className="text-gray-400">Pagado:</span>
                  <span className="text-white">
                    {isBolivares
                      ? `${parseFloat(solicitud.pagado).toFixed(2)} BS`
                      : `$${parseFloat(solicitud.pagado).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Saldo:</span>
                  <span className="text-white font-semibold">
                    {isBolivares
                      ? `${saldoPendiente.toFixed(2)} BS`
                      : `$${saldoPendiente.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-3">
                <BotonIcono
                  tipo="ver"
                  titulo="Ver"
                  small
                  onClick={() => handleVerSolicitud(solicitud)}
                />

                {puedePagar && (
                  <BotonIcono
                    tipo="abonar"
                    onClick={() => handleAgregarPago(solicitud)}
                    disabled={solicitud.estado !== "por_pagar"}
                    small
                    className={`${
                      solicitud.estado !== "por_pagar"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    titulo="Pagar"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      <Paginacion
        paginaActual={page}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPage}
      />

      {/* Modales */}
      <ModalRegistrarPago
        visible={pagarData.visible}
        solicitudId={pagarData.solicitudId}
        onClose={() => setPagarData({ visible: false, solicitudId: null })}
        onPaid={onPagoExitoso}
      />

      <ModalVerSolicitudDePago
        visible={verSolicitudData.visible}
        onClose={() =>
          setVerSolicitudData({ ...verSolicitudData, visible: false })
        }
        solicitud={verSolicitudData.solicitud}
      />

      <ModalExito
        visible={modalExitoData.visible}
        onClose={() => setModalExitoData({ ...modalExitoData, visible: false })}
        titulo={modalExitoData.titulo}
        mensaje={modalExitoData.mensaje}
        textoBoton={modalExitoData.textoBoton}
      />

      <ModalError
        visible={modalErrorData.visible}
        onClose={() => setModalErrorData({ ...modalErrorData, visible: false })}
        titulo={modalErrorData.titulo}
        mensaje={modalErrorData.mensaje}
        textoBoton={modalErrorData.textoBoton}
      />
    </div>
  );
}

export default ListaSolicitudesPago;
