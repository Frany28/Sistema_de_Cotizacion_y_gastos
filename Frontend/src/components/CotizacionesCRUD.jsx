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
import ModalDetalleCotizacion from "../components/Modals/ModalDetalleCotizacion";
import Loader from "../components/general/Loader";
import ModalCambioEstado from "../components/Modals/ModalCambiosEstado";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront";
import { useLocation, useNavigate } from "react-router-dom";
import ModalMotivoRechazo from "../components/Modals/ModalMotivoRechazo";

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
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("");
  const [serviciosProductos, setServiciosProductos] = useState([]);
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

  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        const [resClientes, resSucursales, resSP] = await Promise.all([
          api.get("/clientes"),
          api.get("/sucursales"),
          api.get("/servicios-productos"),
        ]);

        setClientes(resClientes.data.clientes);
        setSucursales(resSucursales.data.sucursales);
        setServiciosProductos(resSP.data.servicios);
      } catch (err) {
        console.error("Error cargando maestros:", err);
      }
    };
    fetchMaestros();
  }, []);

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

  const cambiarPagina = (nuevaPagina) => {
    setPage(nuevaPagina);
  };

  // --- Fetch de cotizaciones con paginación en servidor ---
  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    try {
      // Llama al endpoint con paginación
      const res = await api.get("/cotizaciones");

      setCotizaciones(res.data.cotizaciones);
      setTotal(res.data.total);
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
  }, []);

  useEffect(() => {
    fetchCotizaciones();
  }, []);

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

  // Dentro de CotizacionesCRUD.jsx, justo antes del `return ( ... )`:

  const cambiarEstadoCotizacion = async (id, estado, motivo = null) => {
    try {
      // 1) Construir payload
      const payload = { estado };
      if (estado === "rechazada") {
        if (!motivo || !motivo.trim()) {
          mostrarError({
            titulo: "Motivo requerido",
            mensaje: "Debes indicar el motivo del rechazo.",
          });
          return;
        }
        payload.motivo_rechazo = motivo.trim();
      }

      // 2) Llamada al API
      await api.patch(`/cotizaciones/${id}/estado`, payload, {
        withCredentials: true,
      });

      // 3) Mostrar éxito y recargar datos
      mostrarMensajeExito({
        titulo: "Estado actualizado",
        mensaje: `La cotización ahora está ${estado}.`,
      });
      fetchCotizaciones();
    } catch (error) {
      console.error("Error al cambiar estado de cotización:", error);
      mostrarError({
        titulo: "Error",
        mensaje: "No se pudo actualizar el estado de la cotización.",
      });
    } finally {
      // 4) Limpiar todos los modales y estados asociados
      setMostrarModalEstado(false);
      setMostrarModalRechazo(false);
      setCotizacionAActualizar(null);
      setEstadoSeleccionado("");
    }
  };

  const cotizacionesFiltradas = cotizaciones.filter((c) =>
    [c.codigo, c.cliente_nombre, c.estado].some((campo) =>
      campo?.toString().toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  // 2) Calcular total de páginas según los filtrados
  const totalPaginas = Math.ceil(cotizacionesFiltradas.length / limit);

  // 3) Slice para la página actual
  const cotizacionesPaginadas = cotizacionesFiltradas.slice(
    (page - 1) * limit,
    page * limit
  );

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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  fetchCotizaciones();
                }
              }}
              className="pl-10  border   text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>
      <div className="px-4 pb-2 text-sm text-gray-400">
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
                    titulo="Cambiar Estado"
                    onClick={() => {
                      if (c.estado === "aprobada" || c.estado === "rechazada") {
                        mostrarError({
                          titulo: "Acción no permitida",
                          mensaje:
                            "No puedes cambiar el estado de una cotización que ya fue aprobada o rechazada.",
                        });
                      } else {
                        setCotizacionAActualizar(c);
                        setMostrarModalEstado(true);
                      }
                    }}
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
                    titulo="Editar Cotización"
                    onClick={async () => {
                      if (c.estado === "aprobada") {
                        return mostrarError({
                          titulo: "Acción no permitida",
                          mensaje: "No puedes editar una cotización aprobada.",
                        });
                      }
                      setLoading(true);
                      try {
                        const { data } = await api.get(`/cotizaciones/${c.id}`);
                        setCotizacionSeleccionada({
                          id: data.id,
                          cliente_id: data.cliente_id?.toString() || "",
                          sucursal_id: data.sucursal_id?.toString() || "",
                          estado: data.estado,
                          confirmacion_cliente: data.confirmacion_cliente
                            ? "1"
                            : "0",
                          observaciones: data.observaciones || "",
                          operacion: data.operacion || "",
                          mercancia: data.mercancia || "",
                          bl: data.bl || "",
                          contenedor: data.contenedor || "",
                          puerto: data.puerto || "",
                          detalle: Array.isArray(data.detalle)
                            ? data.detalle
                            : [],
                        });
                        setMostrarModalEditar(true);
                      } catch (error) {
                        console.error("Error cargando cotización:", error);
                        mostrarError({
                          titulo: "Error al cargar",
                          mensaje:
                            "No se pudo cargar la cotización para edición.",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                )}

                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    onClick={() => {
                      if (c.estado === "aprobada") {
                        mostrarError({
                          titulo: "Acción no permitida",
                          mensaje:
                            "No puedes eliminar una cotización aprobada.",
                        });
                      } else {
                        setIdAEliminar(c.id);
                        setMostrarConfirmacion(true);
                      }
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
        paginaActual={page}
        totalPaginas={totalPaginas}
        onCambiarPagina={cambiarPagina}
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
          visible={mostrarModalEditar}
          onClose={() => {
            setMostrarModalEditar(false);
            setCotizacionSeleccionada(null);
          }}
          onSubmit={async (formActualizado) => {
            try {
              const id = cotizacionSeleccionada.id;

              // 1) Crear 'detallePayload' solo con los campos que el controlador espera 
              const detallePayload = formActualizado.detalle.map((item) => ({
                ...(item.id ? { id: Number(item.id) } : {}),
                servicio_productos_id: Number(item.servicio_productos_id),
                cantidad: Number(item.cantidad),
                precio_unitario: Number(item.precio_unitario),
                porcentaje_iva: Number(item.porcentaje_iva),
              }));

              //  2) Enviar el PUT con cabecera + detallePayload 
              await api.put(`/cotizaciones/${id}`, {
                cliente_id: Number(formActualizado.cliente_id),
                sucursal_id: Number(formActualizado.sucursal_id),
                operacion: formActualizado.operacion.trim(),
                mercancia: formActualizado.mercancia.trim(),
                bl: formActualizado.bl.trim(),
                contenedor: formActualizado.contenedor.trim(),
                puerto: formActualizado.puerto.trim(),
                confirmacion_cliente:
                  formActualizado.confirmacion_cliente === "1",
                observaciones: formActualizado.observaciones.trim(),
                detalle: detallePayload,
              });

              mostrarMensajeExito({
                titulo: "Cotización actualizada",
                mensaje: "Los cambios fueron guardados correctamente.",
              });
              setMostrarModalEditar(false);
              setCotizacionSeleccionada(null);
              fetchCotizaciones();
            } catch (error) {
              console.error("Error al editar cotización:", error);
              if (error.response && error.response.data) {
                console.error(
                  "Respuesta 400 del servidor (error.response.data):",
                  error.response.data
                );
              }
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
          serviciosProductos={serviciosProductos}
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
          // Si el usuario elige “rechazada”, abrimos el modal de motivo
          if (nuevoEstado === "rechazada") {
            setEstadoSeleccionado(nuevoEstado);
            setMostrarModalEstado(false);
            setMostrarModalRechazo(true);
            return;
          }
          // Para cualquier otro estado, reutilizamos la función
          cambiarEstadoCotizacion(cotizacionAActualizar.id, nuevoEstado);
        }}
      />
      {mostrarModalRechazo && (
        <ModalMotivoRechazo
          visible={mostrarModalRechazo}
          onClose={() => {
            setMostrarModalRechazo(false);
            setCotizacionAActualizar(null);
            setEstadoSeleccionado("");
          }}
          onSubmit={async (motivo) => {
            try {
              await api.patch(
                `/cotizaciones/${cotizacionAActualizar.id}/estado`,
                { estado: estadoSeleccionado, motivo_rechazo: motivo },
                { withCredentials: true }
              );
              mostrarMensajeExito({
                titulo: "Rechazo registrado",
                mensaje: `La cotización ha sido rechazada.`,
              });
              fetchCotizaciones();
            } catch {
              mostrarError({
                titulo: "Error",
                mensaje: "No se pudo registrar el motivo de rechazo.",
              });
            } finally {
              setMostrarModalRechazo(false);
              setCotizacionAActualizar(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default ListaCotizaciones;
