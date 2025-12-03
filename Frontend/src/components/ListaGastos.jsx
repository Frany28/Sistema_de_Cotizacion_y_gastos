// src/components/ListaGastos.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../api/index.js";
import BotonIcono from "./general/BotonIcono";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import Paginacion from "../components/general/Paginacion";
import Loader from "./general/Loader";
import ModalCambioEstado from "../components/Modals/ModalCambiosEstado";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront.js";
import ModalVerGasto from "../components/Modals/ModalVerGasto.jsx";
import ModalEditarGasto from "../components/Modals/ModalEditarGasto.jsx";
import ModalMotivoRechazo from "../components/Modals/ModalMotivoRechazo.jsx";

function ListaGastos() {
  // Estados principales
  const [gastos, setGastos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [totalGastos, setTotalGastos] = useState(0);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("gastosLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [puedeCambiarEstado, setPuedeCambiarEstado] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);

  const [loadingInicial, setLoadingInicial] = useState(true); // sólo 1ª vez
  const [loading, setLoading] = useState(false);

  // Estados para modales
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarModalVer, setMostrarModalVer] = useState(false);
  const [mostrarModalCambio, setMostrarModalCambio] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  // Estados para datos seleccionados
  const [editandoGasto, setEditandoGasto] = useState(null);
  const [gastoAEliminar, setGastoAEliminar] = useState(null);
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [gastoCambioEstado, setGastoCambioEstado] = useState(null);
  const [cotizacionesModal, setCotizacionesModal] = useState([]);

  // Estados para filtros y datos de apoyo
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [tiposGasto, setTiposGasto] = useState([]);

  const actualizarGastoEnLista = useCallback(
    (gastoActualizado) => {
      // 1. Buscar nombres en las listas que ya tienes cargadas
      const nombreProveedor =
        proveedores.find((p) => p.id === gastoActualizado.proveedor_id)
          ?.nombre ||
        gastoActualizado.proveedor ||
        "—";

      const nombreSucursal =
        sucursales.find((s) => s.id === gastoActualizado.sucursal_id)?.nombre ||
        gastoActualizado.sucursal ||
        "—";

      // 2. Enriquecer el objeto antes de meterlo al estado
      const gastoConNombres = {
        ...gastoActualizado,
        proveedor: nombreProveedor,
        sucursal: nombreSucursal,
      };

      // 3. Reemplazar el registro en la tabla
      setGastos((prev) =>
        prev.map((g) => (g.id === gastoConNombres.id ? gastoConNombres : g))
      );
    },
    [proveedores, sucursales]
  );

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

  // Mapeo de estados
  const mapEstado = {
    aprobada: "aprobado",
    rechazada: "rechazado",
    pendiente: "pendiente",
  };

  // Funciones de utilidad
  const mostrarMensajeExito = ({
    titulo,
    mensaje,
    textoBoton = "Entendido",
  }) => {
    setModalExitoData({ visible: true, titulo, mensaje, textoBoton });
  };

  const mostrarError = ({ titulo, mensaje, textoBoton = "Cerrar" }) => {
    setModalErrorData({ visible: true, titulo, mensaje, textoBoton });
  };

  // Fetch de datos principales
  const fetchGastos = useCallback(
    async (withSpinner = false) => {
      if (withSpinner) setLoading(true);
      try {
        const response = await api.get("/gastos", {
          params: { page, limit, search: busqueda.trim() },
          withCredentials: true,
        });

        setGastos(Array.isArray(response.data?.data) ? response.data.data : []);
        setTotalGastos(response.data?.total || 0);
      } catch (error) {
        console.error("Error al obtener gastos:", error);
        mostrarError({
          titulo: "Error al obtener los gastos",
          mensaje: "No se pudieron cargar los datos desde la base de datos.",
        });
      } finally {
        if (withSpinner) setLoading(false);
        if (loadingInicial) setLoadingInicial(false);
      }
    },
    [page, limit, busqueda, loadingInicial]
  );

  // Modificar la función fetchDatosSoporte
  const fetchDatosSoporte = useCallback(async () => {
    try {
      const [prov, suc, tipos] = await Promise.all([
        api.get("/proveedores").catch(() => ({ data: [] })),
        api.get("/sucursales").catch(() => ({ data: [] })),
        api.get("/gastos/tipos").catch(() => ({ data: [] })),
      ]);

      setProveedores(Array.isArray(prov.data) ? prov.data : []);
      setSucursales(Array.isArray(suc.data) ? suc.data : []);
      setTiposGasto(Array.isArray(tipos.data) ? tipos.data : []);
    } catch (error) {
      console.error("Error cargando datos de apoyo:", error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchGastos, 300);
    return () => clearTimeout(timer);
  }, [fetchGastos]);

  // Verificación de permisos
  useEffect(() => {
    const verificarPermisos = async () => {
      try {
        const [cambiar, editar, eliminar] = await Promise.all([
          verificarPermisoFront("aprobarGasto"), // ya existía
          verificarPermisoFront("editarGasto"), // nuevo
          verificarPermisoFront("eliminarGasto"), // nuevo
        ]);

        setPuedeCambiarEstado(cambiar);
        setPuedeEditar(editar);
        setPuedeEliminar(eliminar);
      } catch (error) {
        console.error("Error verificando permisos:", error);
        setPuedeCambiarEstado(false);
        setPuedeEditar(false);
        setPuedeEliminar(false);
      }
    };
    verificarPermisos();
  }, []);

  // Carga inicial de datos
  useEffect(() => {
    const cargarDatos = async () => {
      await Promise.all([fetchDatosSoporte(), fetchGastos(true)]);
    };
    cargarDatos();
  }, [fetchGastos, fetchDatosSoporte]);

  // Manejo de búsqueda
  const manejarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPage(1); // siempre vuelvo al inicio del resultado
  };

  const iniciarEdicion = async (gasto) => {
    if (gasto.estado === "aprobado") {
      mostrarError({
        titulo: "Gasto aprobado",
        mensaje: "No puedes editar un gasto que ya está aprobado.",
      });
      return;
    }
    try {
      const { data } = await api.get(`/gastos/${gasto.id}`);
      const { gasto: gastoCompleto, opciones } = data;

      setProveedores(
        Array.isArray(opciones.proveedores) ? opciones.proveedores : []
      );
      setSucursales(
        Array.isArray(opciones.sucursales) ? opciones.sucursales : []
      );
      setTiposGasto(
        Array.isArray(opciones.tiposGasto) ? opciones.tiposGasto : []
      );

      setEditandoGasto(gastoCompleto);
      setCotizacionesModal(opciones.cotizaciones || []);
      setMostrarModalEditar(true);
    } catch (err) {
      console.error("Error al cargar el gasto para edición:", err);
    }
  };

  const eliminarGasto = async (id) => {
    try {
      await api.delete(`/gastos/${id}`);
      setGastos((prev) => prev.filter((g) => g.id !== id));
      mostrarMensajeExito({
        titulo: "Gasto eliminado",
        mensaje: "El gasto fue eliminado correctamente.",
      });
    } catch (error) {
      console.error("Error al eliminar gasto:", error);
      mostrarError({
        titulo: "Error al eliminar gasto",
        mensaje: "No se pudo eliminar el gasto.",
      });
    } finally {
      setMostrarConfirmacion(false);
      setGastoAEliminar(null);
    }
  };

  const cambiarEstadoGasto = async (nuevoEstado, motivo = null) => {
    if (!gastoCambioEstado) return;

    try {
      const payload = { estado: nuevoEstado };
      if (nuevoEstado === "rechazado") {
        if (!motivo || motivo.trim() === "") {
          mostrarError({
            titulo: "Motivo requerido",
            mensaje: "Debes indicar el motivo del rechazo.",
          });
          return;
        }
        payload.motivo_rechazo = motivo;
      }

      await api.put(`/gastos/${gastoCambioEstado.id}/estado`, payload, {
        withCredentials: true,
      });

      setGastos((prev) =>
        prev.map((g) =>
          g.id === gastoCambioEstado.id
            ? { ...g, estado: nuevoEstado, motivo_rechazo: motivo || null }
            : g
        )
      );

      mostrarMensajeExito({
        titulo: "Estado actualizado",
        mensaje: `El gasto ${gastoCambioEstado.codigo} ahora está "${nuevoEstado}".`,
      });
    } catch (error) {
      mostrarError({
        titulo: "Error al cambiar estado",
        mensaje: "Hubo un problema al actualizar el estado.",
      });
    } finally {
      setMostrarModalCambio(false);
      setMostrarModalRechazo(false);
      setGastoCambioEstado(null);
    }
  };

  // Filtrado y paginación
  const gastosFiltrados = gastos
    .filter((g) =>
      [g.descripcion, g.estado, g.codigo, g.proveedor, g.concepto_pago].some(
        (campo) =>
          campo?.toString().toLowerCase().includes(busqueda.toLowerCase())
      )
    )
    .filter((g) =>
      tipoFiltro === "todos" ? true : g.tipo_gasto_id?.toString() === tipoFiltro
    );

  const totalPaginas = Math.ceil(totalGastos / limit);

  const gastosPaginados = gastosFiltrados;

  const cambiarLimite = (nuevoLimite) => {
    setLimit(nuevoLimite);
    localStorage.setItem("gastosLimit", nuevoLimite);
    setPage(1);
  };

  // En ListaGastos.jsx
  const formatearMonto = (valor, moneda) => {
    if (valor === null || valor === undefined) return "—";

    const numero = Number(valor);
    if (Number.isNaN(numero)) return "—";

    const formatoLatam = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // OJO: aquí solo formateamos, NO multiplicamos por tasaCambio.
    if (moneda === "VES") {
      return `${formatoLatam.format(numero)} BS`;
    }

    // USD u otra moneda
    return `${formatoLatam.format(numero)} $`;
  };

  // Renderizado condicional
  if (loadingInicial) {
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
              className="text-sm  text-gray-300 font-medium"
            >
              Mostrar:
            </label>
            <select
              id="cantidad"
              value={limit}
              onChange={(e) => cambiarLimite(Number(e.target.value))}
              className="cursor-pointer text-sm rounded-md border-gray-600 bg-gray-700 text-white"
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
                className="w-5 h-5  text-gray-400"
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

      {/* Filtros por tipo de gasto */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
          {[
            { id: "todos", nombre: "Todos" },
            { id: "1", nombre: "Operativo" },
            { id: "2", nombre: "Gasto por Servicio Prestado" },
            { id: "5", nombre: "Proveedor No Rentable" },
          ].map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setTipoFiltro(tipo.id)}
              className={`px-4 py-1 rounded-full text-sm border cursor-pointer whitespace-nowrap ${
                tipoFiltro === tipo.id
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800 text-white hover:bg-gray-500"
              }`}
            >
              {tipo.nombre}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-400">
          Mostrando {gastos.length} de {totalGastos} resultados
        </div>
      </div>

      {/* Vista de tabla para pantallas grandes */}
      <div className="hidden lg:block">
        <table className="w-full text-sm text-left  text-gray-400">
          {/* Encabezados de tabla */}
          <thead className="text-xs  uppercase  bg-gray-700 text-gray-400">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Impuesto</th>
              <th className="px-4 py-3">Monto Total</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Estado</th>
              {(puedeCambiarEstado || puedeEditar || puedeEliminar) && (
                <th className="px-4 py-3">Acciones</th>
              )}
            </tr>
          </thead>

          {/* Cuerpo de tabla */}
          <tbody>
            {gastosPaginados.map((gasto) => {
              const isBolivares = gasto.moneda === "VES";

              return (
                <tr key={gasto.id} className="border-b border-gray-700">
                  <td className="px-5 py-3">
                    {new Date(gasto.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3">{gasto.codigo}</td>
                  <td className="px-5 py-3">
                    {gasto.proveedor && gasto.proveedor.trim() !== ""
                      ? gasto.proveedor
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate">
                    {gasto.concepto_pago || "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {formatearMonto(gasto.subtotal, gasto.moneda)}
                  </td>
  
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {formatearMonto(gasto.impuesto, gasto.moneda)}
                  </td>
              
                  <td className="px-4 py-3 max-w-[140px] truncate">
                    {formatearMonto(gasto.total, gasto.moneda)}
                  </td>
                  <td>{gasto.sucursal || "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        gasto.estado === "aprobado"
                          ? "bg-green-100 text-green-800"
                          : gasto.estado === "pendiente"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {gasto.estado}
                    </span>
                  </td>
                  {(puedeCambiarEstado || puedeEditar || puedeEliminar) && (
                    <td className="px-4 py-3 flex space-x-2 items-center">
                      {puedeCambiarEstado && (
                        <BotonIcono
                          tipo="estado"
                          onClick={() => {
                            if (gasto.estado === "rechazado") {
                              mostrarError({
                                titulo: "Gasto rechazado",
                                mensaje: "El gasto ya está rechazado.",
                              });
                              return;
                            }

                            if (gasto.estado === "aprobado") {
                              mostrarError({
                                titulo: "Gasto aprobado",
                                mensaje:
                                  "No puedes cambiar el estado de un gasto aprobado.",
                              });
                              return;
                            }

                            setGastoCambioEstado(gasto);
                            setMostrarModalCambio(true);
                          }}
                          titulo="Cambiar estado"
                          disabled={gasto.estado === "aprobado"}
                          className={`${
                            gasto.estado === "aprobado"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      )}

                      {/* VER siempre visible */}
                      <BotonIcono
                        tipo="ver"
                        onClick={() => {
                          setGastoSeleccionado(gasto);
                          setMostrarModalVer(true);
                        }}
                        titulo="Ver gasto"
                      />

                      {/* EDITAR visible solo si tiene permiso */}
                      {puedeEditar && (
                        <BotonIcono
                          tipo="editar"
                          onClick={() => iniciarEdicion(gasto)}
                          titulo="Editar gasto"
                          disabled={gasto.estado === "aprobado"}
                          className={`${
                            gasto.estado === "aprobado"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      )}

                      {/* ELIMINAR visible solo si tiene permiso */}
                      {puedeEliminar && (
                        <BotonIcono
                          tipo="eliminar"
                          onClick={() => {
                            if (gasto.estado === "aprobado") {
                              mostrarError({
                                titulo: "Gasto aprobado",
                                mensaje:
                                  "No puedes eliminar un gasto que ya está aprobado.",
                              });
                              return;
                            }
                            setGastoAEliminar(gasto);
                            setMostrarConfirmacion(true);
                          }}
                          titulo="Eliminar gasto"
                          disabled={gasto.estado === "aprobado"}
                          className={`${
                            gasto.estado === "aprobado"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas para tablets */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-1 gap-4 p-2">
          {gastosPaginados.map((gasto) => (
            <div key={gasto.id} className="bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white">{gasto.codigo}</h3>
                  <p className="text-sm text-gray-400 max-w-[180px] truncate">
                    {gasto.proveedor && gasto.proveedor.trim() !== ""
                      ? gasto.proveedor
                      : "N/A"}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    gasto.estado === "aprobado"
                      ? "bg-green-100 text-green-800"
                      : gasto.estado === "pendiente"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {gasto.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-gray-400">Fecha:</span>
                  <span className="text-white ml-1">
                    {new Date(gasto.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Concepto:</span>
                  <span className="text-white ml-1 block truncate">
                    {gasto.concepto_pago || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white ml-1 block truncate">
                    {formatearMonto(gasto.subtotal, gasto.moneda)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Impuesto:</span>
                  <span className="text-white ml-1 block truncate">
                    {formatearMonto(gasto.impuesto, gasto.moneda)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white ml-1 font-semibold block truncate">
                    {formatearMonto(gasto.total, gasto.moneda)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Sucursal:</span>
                  <span className="text-white ml-1">
                    {gasto.sucursal || "—"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-3">
                <BotonIcono
                  tipo="ver"
                  titulo="Ver detalle"
                  small
                  onClick={() => {
                    setGastoSeleccionado(gasto);
                    setMostrarModalVer(true);
                  }}
                />

                {puedeCambiarEstado && (
                  <BotonIcono
                    tipo="estado"
                    titulo="Cambiar Estado"
                    small
                    onClick={() => {
                      if (gasto.estado === "rechazado") {
                        mostrarError({
                          titulo: "Gasto rechazado",
                          mensaje: "El gasto ya está rechazado.",
                        });
                        return;
                      }

                      if (gasto.estado === "aprobado") {
                        mostrarError({
                          titulo: "Gasto aprobado",
                          mensaje:
                            "No puedes cambiar el estado de un gasto aprobado.",
                        });
                        return;
                      }

                      setGastoCambioEstado(gasto);
                      setMostrarModalCambio(true);
                    }}
                    disabled={gasto.estado === "aprobado"}
                    className={`${
                      gasto.estado === "aprobado"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  />
                )}

                {puedeEditar && (
                  <BotonIcono
                    tipo="editar"
                    titulo="Editar"
                    small
                    onClick={() => iniciarEdicion(gasto)}
                    disabled={gasto.estado === "aprobado"}
                    className={`${
                      gasto.estado === "aprobado"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  />
                )}

                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    small
                    onClick={() => {
                      if (gasto.estado === "aprobado") {
                        mostrarError({
                          titulo: "Gasto aprobado",
                          mensaje:
                            "No puedes eliminar un gasto que ya está aprobado.",
                        });
                        return;
                      }
                      setGastoAEliminar(gasto);
                      setMostrarConfirmacion(true);
                    }}
                    disabled={gasto.estado === "aprobado"}
                    className={`${
                      gasto.estado === "aprobado"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden">
        <div className="grid grid-cols-1 gap-3 p-2">
          {gastosPaginados.map((gasto) => (
            <div key={gasto.id} className="bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-white">{gasto.codigo}</h3>
                  <p className="text-sm text-gray-400">
                    {gasto.proveedor && gasto.proveedor.trim() !== ""
                      ? gasto.proveedor
                      : "N/A"}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    gasto.estado === "aprobado"
                      ? "bg-green-100 text-green-800"
                      : gasto.estado === "pendiente"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {gasto.estado}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Fecha:</span>
                  <span className="text-white">
                    {new Date(gasto.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Concepto:</span>
                  <span className="text-white">
                    {gasto.concepto_pago || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">
                    {formatearMonto(gasto.subtotal, gasto.moneda)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Impuesto:</span>
                  <span className="text-white">
                    {formatearMonto(gasto.impuesto, gasto.moneda)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white font-semibold">
                    {formatearMonto(gasto.total, gasto.moneda)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sucursal:</span>
                  <span className="text-white">{gasto.sucursal || "—"}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-3">
                <BotonIcono
                  tipo="ver"
                  titulo="Ver detalle"
                  small
                  onClick={() => {
                    setGastoSeleccionado(gasto);
                    setMostrarModalVer(true);
                  }}
                />

                {puedeCambiarEstado && (
                  <BotonIcono
                    tipo="estado"
                    titulo="Cambiar Estado"
                    small
                    onClick={() => {
                      if (gasto.estado === "rechazado") {
                        mostrarError({
                          titulo: "Gasto rechazado",
                          mensaje: "El gasto ya está rechazado.",
                        });
                        return;
                      }

                      if (gasto.estado === "aprobado") {
                        mostrarError({
                          titulo: "Gasto aprobado",
                          mensaje:
                            "No puedes cambiar el estado de un gasto aprobado.",
                        });
                        return;
                      }

                      setGastoCambioEstado(gasto);
                      setMostrarModalCambio(true);
                    }}
                    disabled={gasto.estado === "aprobado"}
                    className={`${
                      gasto.estado === "aprobado"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  />
                )}

                {puedeEditar && (
                  <BotonIcono
                    tipo="editar"
                    titulo="Editar"
                    small
                    onClick={() => iniciarEdicion(gasto)}
                    disabled={gasto.estado === "aprobado"}
                    className={`${
                      gasto.estado === "aprobado"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  />
                )}

                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    small
                    onClick={() => {
                      if (gasto.estado === "aprobado") {
                        mostrarError({
                          titulo: "Gasto aprobado",
                          mensaje:
                            "No puedes eliminar un gasto que ya está aprobado.",
                        });
                        return;
                      }
                      setGastoAEliminar(gasto);
                      setMostrarConfirmacion(true);
                    }}
                    disabled={gasto.estado === "aprobado"}
                    className={`${
                      gasto.estado === "aprobado"
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paginación */}
      <Paginacion
        paginaActual={page}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPage}
      />

      {/* Modales */}
      <ModalMotivoRechazo
        visible={mostrarModalRechazo}
        onClose={() => setMostrarModalRechazo(false)}
        onSubmit={(motivo) => cambiarEstadoGasto("rechazado", motivo)}
      />

      {gastoAEliminar && (
        <ModalConfirmacion
          visible={mostrarConfirmacion}
          onClose={() => setMostrarConfirmacion(false)}
          onConfirmar={async () => await eliminarGasto(gastoAEliminar.id)}
          titulo="¿Eliminar gasto?"
          mensaje={`¿Seguro que deseas eliminar el gasto con código ${gastoAEliminar.codigo}? Esta acción no se puede deshacer.`}
        />
      )}

      <ModalCambioEstado
        visible={mostrarModalCambio}
        onClose={() => {
          setMostrarModalCambio(false);
          setGastoCambioEstado(null);
        }}
        onSeleccionar={(estadoUI) => {
          const estadoBackend = mapEstado[estadoUI] || "pendiente";
          if (estadoBackend === "rechazado") {
            setMostrarModalCambio(false);
            setMostrarModalRechazo(true);
          } else {
            cambiarEstadoGasto(estadoBackend);
          }
        }}
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

      <ModalVerGasto
        visible={mostrarModalVer}
        onClose={() => {
          setMostrarModalVer(false);
          setGastoSeleccionado(null);
        }}
        gasto={gastoSeleccionado}
      />

      <ModalEditarGasto
        visible={mostrarModalEditar}
        onClose={() => setMostrarModalEditar(false)}
        gasto={editandoGasto}
        cotizacionesIniciales={cotizacionesModal}
        onSave={actualizarGastoEnLista}
        proveedores={proveedores}
        sucursales={sucursales}
        tiposGasto={tiposGasto}
      />
    </div>
  );
}

export default ListaGastos;
