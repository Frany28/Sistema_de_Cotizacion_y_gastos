// src/components/ListaServiciosProductos.jsx
import React, { useEffect, useState, useCallback } from "react";
import BotonIcono from "./general/BotonIcono";
import BotonAgregar from "../components/general/BotonAgregar";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import ModalEditar from "../components/Modals/ModalEditar";
import ModalAñadirServicioProducto from "../components/Modals/ModalAñadirServicioProducto";
import Paginacion from "../components/general/Paginacion";
import Loader from "./general/Loader";
import api from "../api/index";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront.js";

function ListaServiciosProductos() {
  const [servicios, setServicios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("productosLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [loading, setLoading] = useState(true);
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);
  const [editandoServicio, setEditandoServicio] = useState(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
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
  const [servicioEditado, setServicioEditado] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    tipo: "servicio",
  });

  const handleEliminarClick = (item) => {
    if (item.estado === "activo") {
      mostrarError({
        titulo: "No permitido",
        mensaje:
          "El producto/servicio está ACTIVO; cámbialo a INACTIVO antes de eliminar.",
      });
      return; // ⬅️  NO abre el modal de confirmación
    }

    setEditandoServicio(item); // producto inactivo → procede
    setMostrarConfirmacion(true);
  };

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

  const fetchServicios = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (tipoFiltro !== "todos") params.tipo = tipoFiltro;

      const { data } = await api.get("/servicios-productos", { params });
      setServicios(data.servicios);
      setTotal(data.total);
    } catch (error) {
      console.error("Error al obtener servicios/productos:", error);
      mostrarError({
        titulo: "Error al obtener los datos",
        mensaje: "No se pudieron cargar los datos desde la base de datos.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, tipoFiltro]);

  useEffect(() => {
    fetchServicios();
  }, [fetchServicios]);

  useEffect(() => {
    (async () => {
      setPuedeCrear(await verificarPermisoFront("crearServicio"));
      setPuedeEditar(await verificarPermisoFront("editarServicio"));
      setPuedeEliminar(await verificarPermisoFront("eliminarServicio"));
    })();
  }, []);

  const manejarBusqueda = (e) => {
    const termino = e.target.value;
    setBusqueda(termino);
    setPage(1);
  };

  const abrirModal = () => setMostrarModal(true);
  const cerrarModal = () => setMostrarModal(false);

  const cambiarTipoFiltro = (tipo) => {
    setTipoFiltro(tipo);
    setPage(1);
  };

  const iniciarEdicion = (servicio) => {
    setEditandoServicio(servicio);
    setServicioEditado({
      nombre: servicio.nombre ?? "",
      descripcion: servicio.descripcion ?? "",
      precio: servicio.precio ?? "",
      tipo: servicio.tipo ?? "",
      estado: servicio.estado ?? "",
      porcentaje_iva: parseFloat(servicio.porcentaje_iva) ?? 0,
      cantidad_actual: servicio.cantidad_actual ?? 0,
      cantidad_anterior: servicio.cantidad_anterior ?? 0,
    });
  };

  const guardarServicioEditado = async (datos) => {
    try {
      const datosValidados = {
        ...datos,
        precio: parseFloat(datos.precio),
        estado: datos.estado || "activo",
      };

      if (datos.tipo === "producto") {
        datosValidados.cantidad_actual = parseInt(datos.cantidad_actual || 0);
        datosValidados.cantidad_anterior = parseInt(
          datos.cantidad_anterior || 0
        );
      } else {
        delete datosValidados.cantidad_actual;
        delete datosValidados.cantidad_anterior;
      }

      const response = await api.put(
        `/servicios-productos/${editandoServicio.id}`,
        datosValidados
      );

      const actualizado = response.data;
      const nuevos = servicios.map((item) =>
        item.id === editandoServicio.id ? { ...item, ...datosValidados } : item
      );

      setServicios(nuevos);
      setEditandoServicio(null);
      setMostrarModalEditar(false);
      mostrarMensajeExito({
        titulo: "Actualizado",
        mensaje: `El registro se actualizó correctamente.`,
      });
    } catch (error) {
      console.error("Error al actualizar servicio/producto:", error);
      setMostrarModalEditar(false);
      mostrarError({
        titulo: "Error",
        mensaje: "No se pudo actualizar el servicio/producto.",
      });
    }
  };

  const cancelarEdicion = () => {
    setEditandoServicio(null);
  };

  const eliminarServicio = async () => {
    try {
      await api.delete(`servicios-productos/${editandoServicio.id}`);

      const actualizados = servicios.filter(
        (s) => s.id !== editandoServicio.id
      );
      setServicios(actualizados);
      mostrarMensajeExito({
        titulo: "Eliminado",
        mensaje: "El registro ha sido eliminado correctamente.",
      });
    } catch (error) {
      if (error.response?.status === 409) {
        mostrarError({
          titulo: "No permitido",
          mensaje:
            error.response.data?.message ||
            "El producto/servicio está ACTIVO; cámbialo a INACTIVO antes de eliminar.",
        });
      } else {
        console.error("Error al eliminar servicio/producto:", error);
        mostrarError({
          titulo: "Error",
          mensaje: "No se pudo eliminar el servicio/producto.",
        });
      }
    } finally {
      setMostrarConfirmacion(false);
    }
  };

  const filtrados = (Array.isArray(servicios) ? servicios : []).filter((s) =>
    ["nombre", "descripcion", "tipo"].some((campo) =>
      s[campo]?.toLowerCase().includes(busqueda.toLowerCase())
    )
  );
  const paginados = filtrados;
  const totalPaginas = Math.ceil(total / limit);

  const cambiarLimite = (nuevo) => {
    setLimit(nuevo);
    localStorage.setItem("productosLimit", nuevo);
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
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-2">
          {puedeCrear && (
            <BotonAgregar
              onClick={abrirModal}
              texto="Nuevo Producto o Servicio"
            />
          )}
        </div>

        <div className="flex flex-col md:flex-row w-full md:w-1/2 gap-2">
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
              className="cursor-pointer text-sm rounded-md border-gray-600 bg-gray-700 text-white"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
          </div>
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
              placeholder="Buscar..."
              value={busqueda}
              onChange={manejarBusqueda}
              className="pl-10 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        {mostrarModal && (
          <ModalAñadirServicioProducto
            onCancel={cerrarModal}
            onSubmit={(nuevo) => {
              cerrarModal();
              setPage(1);
              fetchServicios();
              mostrarMensajeExito({
                titulo: "Creado",
                mensaje: "El producto/servicio se registró correctamente.",
              });
            }}
            onSuccess={mostrarMensajeExito}
          />
        )}
      </div>

      <div className="px-4 pb-2 text-sm text-gray-400">
        <div className="flex gap-2 pb-3 overflow-x-auto">
          {["todos", "servicio", "producto"].map((tipo) => (
            <button
              key={tipo}
              onClick={() => cambiarTipoFiltro(tipo)}
              className={`px-4 py-1 rounded-full text-sm border cursor-pointer whitespace-nowrap ${
                tipoFiltro === tipo
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800 text-white hover:bg-gray-500"
              }`}
            >
              {tipo === "todos"
                ? "Todos"
                : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>
        Mostrando {paginados.length} de {total} resultados
      </div>

      {/* Vista de tabla para pantallas medianas y grandes */}
      <div className="hidden md:block">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs uppercase bg-gray-700 text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Cantidad Anterior</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((item) => (
              <tr key={item.id} className="border-b border-gray-700">
                <td className="px-4 py-3 font-medium whitespace-nowrap text-white">
                  {item.codigo || "—"}
                </td>
                <td className="px-4 py-3 font-medium whitespace-nowrap text-white">
                  {item.nombre}
                </td>
                <td className="px-4 py-3">{item.descripcion}</td>
                <td className="px-4 py-3">${Number(item.precio).toFixed(2)}</td>
                <td className="px-4 py-3 capitalize">{item.tipo}</td>
                <td className="px-4 py-3 capitalize">{item.estado}</td>
                <td className="px-4 py-3">{item.cantidad_actual || "—"}</td>
                <td className="px-4 py-3">{item.cantidad_anterior || "—"}</td>
                <td className="px-4 py-3 flex space-x-2">
                  {puedeEditar && (
                    <BotonIcono
                      tipo="editar"
                      onClick={() => {
                        iniciarEdicion(item);
                        setMostrarModalEditar(true);
                      }}
                      titulo="Editar"
                    />
                  )}
                  {puedeEliminar && (
                    <BotonIcono
                      tipo="eliminar"
                      onClick={() => handleEliminarClick(item)}
                      titulo="Eliminar"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden space-y-3 p-2">
        {paginados.map((item) => (
          <div key={item.id} className="bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">{item.nombre}</h3>
                <p className="text-sm text-gray-400">{item.descripcion}</p>
              </div>
              <div className="flex space-x-2">
                {puedeEditar && (
                  <BotonIcono
                    tipo="editar"
                    onClick={() => {
                      iniciarEdicion(item);
                      setMostrarModalEditar(true);
                    }}
                    titulo="Editar"
                    small
                  />
                )}
                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    onClick={() => handleEliminarClick(item)}
                    titulo="Eliminar"
                    small
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div>
                <span className="text-gray-400">Código:</span>
                <span className="text-white ml-1">{item.codigo || "—"}</span>
              </div>
              <div>
                <span className="text-gray-400">Precio:</span>
                <span className="text-white ml-1">
                  ${Number(item.precio).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Tipo:</span>
                <span className="text-white ml-1 capitalize">{item.tipo}</span>
              </div>
              <div>
                <span className="text-gray-400">Estado:</span>
                <span className="text-white ml-1 capitalize">
                  {item.estado}
                </span>
              </div>
              {item.tipo === "producto" && (
                <>
                  <div>
                    <span className="text-gray-400">Cantidad:</span>
                    <span className="text-white ml-1">
                      {item.cantidad_actual || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Anterior:</span>
                    <span className="text-white ml-1">
                      {item.cantidad_anterior || "—"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Paginacion
        paginaActual={page}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPage}
      />

      <ModalExito
        {...modalExitoData}
        onClose={() => setModalExitoData({ ...modalExitoData, visible: false })}
      />
      <ModalError
        {...modalErrorData}
        onClose={() => setModalErrorData({ ...modalErrorData, visible: false })}
      />

      <ModalConfirmacion
        visible={mostrarConfirmacion}
        onClose={() => setMostrarConfirmacion(false)}
        onConfirmar={eliminarServicio}
        titulo="¿Eliminar producto o servicio?"
        mensaje={`¿Estás seguro que deseas eliminar "${editandoServicio?.nombre}"? Esta acción no se puede deshacer.`}
      />

      {mostrarModalEditar && (
        <ModalEditar
          titulo="Editar Servicio/Producto"
          campos={[
            { name: "nombre", label: "Nombre", className: "col-span-2" },
            {
              name: "descripcion",
              label: "Descripción",
              className: "col-span-2",
            },

            // Ahora dos campos por fila:
            {
              name: "precio",
              label: "Precio",
              type: "number",
              className: "sm:col-span-1",
            },
            {
              name: "porcentaje_iva",
              label: "Tipo de Impuesto",
              type: "select",
              options: [
                { value: 0, label: "Exento (0%)" },
                { value: 8, label: "Reducido (8%)" },
                { value: 16, label: "No Exento (16%)" },
              ],
              className: "sm:col-span-1",
            },

            {
              name: "tipo",
              label: "Tipo",
              type: "select",
              options: ["servicio", "producto"],
              className: "sm:col-span-1",
            },
            {
              name: "estado",
              label: "Estado",
              type: "select",
              options: ["activo", "inactivo"],
              className: "sm:col-span-1",
            },

            ...(servicioEditado?.tipo === "producto"
              ? [
                  {
                    name: "cantidad_actual",
                    label: "Cantidad Actual",
                    type: "number",
                    className: "sm:col-span-1",
                  },
                  {
                    name: "cantidad_anterior",
                    label: "Cantidad Anterior",
                    type: "number",
                    className: "sm:col-span-1",
                  },
                ]
              : []),
          ]}
          datosIniciales={servicioEditado}
          onSubmit={guardarServicioEditado}
          onCancel={() => {
            setMostrarModalEditar(false);
            cancelarEdicion();
          }}
        />
      )}
    </div>
  );
}

export default ListaServiciosProductos;
