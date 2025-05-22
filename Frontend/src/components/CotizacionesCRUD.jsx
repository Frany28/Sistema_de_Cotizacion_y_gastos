// CotizacionesCRUD.jsx actualizado con mejoras visuales de ClientesCRUD
import React, { useEffect, useState, useCallback } from "react";
import api from "../api/index";
import BotonAgregar from "../components/general/BotonAgregar";
import BotonIcono from "../components/general/BotonIcono";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";
import Paginacion from "../components/general/Paginacion";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import ModalEditarCotizacion from "../components/Modals/ModalEditarCotizacion";
import { useMemo } from "react";
import ModalDetalleCotizacion from "../components/Modals/ModalDetalleCotizacion";
import Loader from "../components/general/Loader";
import ModalCambioEstado from "../components/Modals/ModalCambiosEstado";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront";
import { useLocation, useNavigate } from "react-router-dom";

function ListaCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [idAEliminar, setIdAEliminar] = useState(null);
  const [mostrarModalEstado, setMostrarModalEstado] = useState(false);
  const [cotizacionAActualizar, setCotizacionAActualizar] = useState(null);
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);
  const [puedeAprobar, setPuedeAprobar] = useState(false);
  const navigate = useNavigate();

  const eliminarCotizacion = async (id) => {
    try {
      await api.delete(`/cotizaciones/${id}`);
      mostrarMensajeExito({
        titulo: "Cotización eliminada",
        mensaje: "La cotización fue eliminada correctamente.",
      });
      fetchCotizaciones();
    } catch (error) {
      console.error("Error al eliminar:", error);
      mostrarError({
        titulo: "Error",
        mensaje: "No se pudo eliminar la cotización.",
      });
    }
  };

  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("cotizacionesLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [busqueda, setBusqueda] = useState("");
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
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);

  useEffect(() => {
    const verificarPermisos = async () => {
      setPuedeCrear(await verificarPermisoFront("crear_cotizacion"));
      setPuedeEditar(await verificarPermisoFront("editar_cotizacion"));
      setPuedeEliminar(await verificarPermisoFront("eliminar_cotizacion"));
      setPuedeAprobar(await verificarPermisoFront("aprobar_cotizacion"));
    };
    verificarPermisos();
  }, []);

  useEffect(() => {
    const fetchClientesSucursales = async () => {
      try {
        const [resClientes, resSucursales] = await Promise.all([
          api.get("/clientes"),
          api.get("/sucursales"),
        ]);
        setClientes(resClientes.data);
        setSucursales(resSucursales.data);
      } catch (error) {
        console.error("Error al cargar clientes o sucursales:", error);
      }
    };

    fetchClientesSucursales();
  }, []);

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

  // --- Fetch de cotizaciones con paginación en servidor ---
  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    try {
      // Llama al endpoint con paginación
      const res = await api.get("/cotizaciones", {
        params: { page, limit },
      });
      // La respuesta tiene { cotizaciones, total, page, limit }
      setCotizaciones(res.data.cotizaciones);
      setTotal(res.data.total);
      console.log("Cotizaciones recibidas:", res.data.cotizaciones);
    } catch (error) {
      console.error("Error al obtener cotizaciones:", error);
      setModalErrorData({
        visible: true,
        titulo: "Error",
        mensaje: "No se pudieron cargar las cotizaciones.",
        textoBoton: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  const cotizacionesFiltradas = cotizaciones.filter((c) =>
    [c.codigo, c.cliente_nombre, c.estado].some((campo) =>
      campo?.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const totalPaginas = Math.ceil(cotizacionesFiltradas.length / limit);
  const cotizacionesPaginadas = cotizacionesFiltradas.slice(
    (page - 1) * limit,
    page * limit
  );

  const cambiarLimite = (nuevoLimite) => {
    setLimit(nuevoLimite);
    localStorage.setItem("cotizacionesLimit", nuevoLimite);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 p-4 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {puedeCrear ? (
            <BotonAgregar
              titulo="Crear Cotización"
              onClick={() => navigate("/crearRegistro")}
            />
          ) : (
            <BotonAgregar
              titulo="Crear Cotización"
              onClick={() =>
                setModalErrorData({
                  visible: true,
                  titulo: "Permiso denegado",
                  mensaje: "No tienes permiso para crear cotizaciones.",
                  textoBoton: "Cerrar",
                })
              }
            />
          )}
        </div>

        <div className="flex w-full md:w-1/2 gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="cantidad"
              className="text-sm  text-gray-300 font-medium"
            >
              Mostrar Registros:
            </label>
            <select
              id="cantidad"
              value={limit}
              onChange={(e) => cambiarLimite(Number(e.target.value))}
              className="text-sm rounded-md  border-gray-600 bg-gray-700 text-white"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
          </div>
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
              placeholder="Buscar cotización..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10  border   text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>
      <div className="px-4 pb-2 text-sm  text-gray-400">
        Mostrando {cotizacionesPaginadas.length} de{" "}
        {cotizacionesFiltradas.length} resultados
      </div>
      <table className="w-full text-sm text-left  text-gray-400">
        <thead className="text-xs  uppercase bg-gray-700 text-gray-400">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Sucursal</th>
            <th className="px-4 py-3">Subtotal</th>
            <th className="px-4 py-3">IVA</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cotizacionesPaginadas.map((c) => (
            <tr key={c.id} className="border-b border-gray-700">
              <td className="px-4 py-3 font-medium  text-white">{c.codigo}</td>
              <td className="px-4 py-3">{c.cliente_nombre}</td>
              <td className="px-4 py-3">
                {new Date(c.fecha).toLocaleDateString("es-VE")}
              </td>
              <td className="px-4 py-3">{c.sucursal || "—"}</td>
              <td className="px-4 py-3">
                ${parseFloat(c.subtotal).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                ${parseFloat(c.impuesto).toFixed(2)}
              </td>
              <td className="px-4 py-3 font-semibold">
                ${parseFloat(c.total).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    c.estado === "aprobada"
                      ? "bg-green-100 text-green-800"
                      : c.estado === "pendiente"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {c.estado}
                </span>
              </td>
              <td className="px-4 py-3 flex space-x-2">
                {puedeAprobar && (
                  <BotonIcono
                    tipo="estado"
                    onClick={() => {
                      setCotizacionAActualizar(c);
                      setMostrarModalEstado(true);
                    }}
                    titulo="Cambiar Estado de Cotización"
                  />
                )}

                <BotonIcono
                  tipo="ver"
                  titulo="Ver detalle"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/cotizaciones/${c.id}`);
                      setCotizacionSeleccionada(res.data);
                      setMostrarModalDetalle(true);
                    } catch (error) {
                      console.error(
                        "Error al cargar detalle de cotización:",
                        error
                      );
                      mostrarError({
                        titulo: "Error",
                        mensaje:
                          "No se pudo cargar la cotización para ver el detalle.",
                      });
                    }
                  }}
                />
                {puedeEditar && (
                  <BotonIcono
                    tipo="editar"
                    titulo="Editar"
                    onClick={async () => {
                      try {
                        setLoading(true); // Activar el loader general
                        const response = await api.get(`/cotizaciones/${c.id}`);
                        const cotizacionCompleta = response.data;

                        setCotizacionSeleccionada({
                          id: cotizacionCompleta.id,
                          cliente_id: cotizacionCompleta.cliente_id ?? null,
                          sucursal_id: cotizacionCompleta.sucursal_id ?? null,
                          estado: cotizacionCompleta.estado,
                          confirmacion_cliente:
                            cotizacionCompleta.confirmacion_cliente ? "1" : "0",
                          observaciones: cotizacionCompleta.observaciones ?? "",
                          detalle: cotizacionCompleta.detalle || [],
                        });
                        setMostrarModalEditar(true);
                      } catch (error) {
                        console.error("Error al cargar cotización:", error);
                        mostrarError({
                          titulo: "Error",
                          mensaje:
                            "No se pudo cargar la cotización para edición",
                        });
                      } finally {
                        setLoading(false); // Desactivar el loader
                      }
                    }}
                  />
                )}
                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    titulo="Eliminar"
                    onClick={() => {
                      setIdAEliminar(c.id);
                      setMostrarConfirmacion(true);
                    }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Paginación */}
      <Paginacion
        total={total}
        limit={limit}
        page={page}
        onPageChange={cambiarPagina}
      />
      <ModalDetalleCotizacion
        visible={mostrarModalDetalle}
        onClose={() => {
          setMostrarModalDetalle(false);
          setCotizacionSeleccionada(null);
        }}
        cotizacion={cotizacionSeleccionada}
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
      {mostrarModalEditar && cotizacionSeleccionada && (
        <ModalEditarCotizacion
          titulo="Editar Cotización"
          visible={true}
          onClose={() => {
            setMostrarModalEditar(false);
            setCotizacionSeleccionada(null);
          }}
          onSubmit={async (formActualizado) => {
            try {
              const id = cotizacionSeleccionada.id;
              const response = await api.put(`/cotizaciones/${id}`, {
                cliente_id: formActualizado.cliente_id,
                sucursal_id: formActualizado.sucursal_id,
                confirmacion_cliente:
                  formActualizado.confirmacion_cliente === "1",
                observaciones: formActualizado.observaciones,
              });
              if (response.status === 200) {
                mostrarMensajeExito({
                  titulo: "Cotización actualizada",
                  mensaje: "Los cambios fueron guardados correctamente.",
                });
                setMostrarModalEditar(false);
                setCotizacionSeleccionada(null);
                fetchCotizaciones();
              }
            } catch (error) {
              console.error("Error al editar cotización:", error);
              mostrarError({
                titulo: "Error",
                mensaje:
                  error.response?.data?.message ||
                  "Hubo un problema al actualizar la cotización.",
              });
            }
          }}
          cotizacion={cotizacionSeleccionada}
          clientes={clientes}
          sucursales={sucursales}
        />
      )}
      <ModalConfirmacion
        visible={mostrarConfirmacion}
        onClose={() => {
          setMostrarConfirmacion(false);
          setIdAEliminar(null);
        }}
        onConfirmar={() => {
          eliminarCotizacion(idAEliminar);
          setMostrarConfirmacion(false);
        }}
        titulo="¿Eliminar cotización?"
        mensaje="Esta acción no se puede deshacer. ¿Deseas continuar?"
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
      />
      <ModalCambioEstado
        visible={mostrarModalEstado}
        onClose={() => {
          setMostrarModalEstado(false);
          setCotizacionAActualizar(null);
        }}
        titulo="Cambiar Estado de Cotización"
        mensaje={`Seleccione el nuevo estado para la cotización ${cotizacionAActualizar?.codigo}`}
        opciones={[
          {
            label: "Aprobar",
            valor: "aprobada",
            color: "bg-green-600 hover:bg-green-700 text-white",
          },
          {
            label: "Rechazar",
            valor: "rechazada",
            color: "bg-red-600 hover:bg-red-700 text-white",
          },
          {
            label: "Pendiente",
            valor: "pendiente",
            color: "bg-yellow-500 hover:bg-yellow-600 text-white",
          },
        ]}
        onSeleccionar={async (nuevoEstado) => {
          try {
            await api.put(`/cotizaciones/${cotizacionAActualizar.id}/estado`, {
              estado: nuevoEstado,
            });
            mostrarMensajeExito({
              titulo: "Estado actualizado",
              mensaje: `La cotización ahora está ${nuevoEstado}.`,
            });
            fetchCotizaciones();
          } catch (error) {
            console.error("Error al actualizar estado:", error);
            mostrarError({
              titulo: "Error",
              mensaje: "No se pudo actualizar el estado de la cotización.",
            });
          } finally {
            setMostrarModalEstado(false);
            setCotizacionAActualizar(null);
          }
        }}
      />
    </div>
  );
}

export default ListaCotizaciones;
