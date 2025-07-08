// src/components/ListaClientes.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/index";
import ModalAñadirCliente from "../components/Modals/ModalAñadirCliente";
import BotonIcono from "./general/BotonIcono";
import BotonAgregar from "../components/general/BotonAgregar";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import ModalExito from "../components/Modals/ModalExito";
import ModalEditar from "../components/Modals/ModalEditar";
import ModalError from "../components/Modals/ModalError";
import Paginacion from "../components/general/Paginacion";
import Loader from "./general/Loader";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront.js";

function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("clientesLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [loading, setLoading] = useState(true);
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [sucursales, setSucursales] = useState([]);
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
  const [clienteEditado, setClienteEditado] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
  });
  const sucursalesMap = useMemo(
    () => Object.fromEntries(sucursales.map((s) => [s.id, s.nombre])),
    [sucursales]
  );
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

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/clientes");

      if (response.data && Array.isArray(response.data.clientes)) {
        setClientes(response.data.clientes);
      } else {
        console.warn("Respuesta inesperada:", response.data);
        throw new Error("Respuesta inválida del servidor");
      }
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      mostrarError({
        titulo: "Error al obtener los clientes",
        mensaje: "No se pudieron cargar los datos desde la base de datos.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/sucursales/dropdown/list");
        setSucursales(data);
      } catch (err) {
        console.error("Error carga sucursales:", err);
      }
    })();
  }, []);

  // ───── Verificar permisos sólo al montar ─────
  useEffect(() => {
    const cargarPermisos = async () => {
      try {
        const [crear, editar, eliminar] = await Promise.all([
          verificarPermisoFront("crearCliente"),
          verificarPermisoFront("editarCliente"),
          verificarPermisoFront("eliminarCliente"),
        ]);
        setPuedeCrear(crear);
        setPuedeEditar(editar);
        setPuedeEliminar(eliminar);
      } catch (err) {
        console.error("Error obteniendo permisos:", err);
      }
    };
    cargarPermisos();
  }, []);

  const manejarBusqueda = (e) => {
    const termino = e.target.value;
    setBusqueda(termino);
    setPage(1);
  };

  const abrirModal = () => setMostrarModal(true);
  const cerrarModal = () => setMostrarModal(false);

  const iniciarEdicion = (cliente) => {
    setEditandoCliente(cliente);
    setClienteEditado({
      nombre: cliente.nombre || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      identificacion: cliente.identificacion || "",
      sucursal_id: cliente.sucursal_id || 4,
    });
  };

  const eliminarCliente = async (id) => {
    try {
      await api.delete(`/clientes/${id}`);
      const actualizados = clientes.filter((cliente) => cliente.id !== id);
      setClientes(actualizados);
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      mostrarError({
        titulo: "Error al eliminar cliente",
        mensaje: "No se pudo eliminar el cliente. Intenta nuevamente.",
      });
    }
  };

  const guardarClienteEditado = async (datos) => {
    try {
      // 1. petición
      const { data: clienteActualizado } = await api.put(
        `/clientes/${editandoCliente.id}`,
        datos
      );

      // 2. actualiza el estado en memoria
      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteActualizado.id ? clienteActualizado : c
        )
      );

      // 3. cierra modal y muestra toast
      setEditandoCliente(null);
      setMostrarModalEditar(false);
      mostrarMensajeExito({
        titulo: "Cliente actualizado",
        mensaje: `Los datos de ${clienteActualizado.nombre} se han actualizado correctamente.`,
        textoBoton: "Cerrar",
      });
    } catch (error) {
      console.error(error);
      mostrarMensajeError("Ocurrió un error al actualizar el cliente");
    }
  };

  const cancelarEdicion = () => {
    setEditandoCliente(null);
  };

  const clientesFiltrados = clientes.filter((cliente) =>
    ["nombre", "email", "telefono", "direccion"].some((campo) =>
      cliente[campo]?.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const totalPaginasCalculadas = Math.ceil(clientesFiltrados.length / limit);
  const clientesPaginados = clientesFiltrados.slice(
    (page - 1) * limit,
    page * limit
  );

  const cambiarLimite = (nuevoLimite) => {
    setLimit(nuevoLimite);
    localStorage.setItem("clientesLimit", nuevoLimite);
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
          {puedeCrear && (
            <BotonAgregar onClick={abrirModal} texto="Nuevo Cliente" />
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
              className="cursor-pointer text-sm rounded-md  border-gray-600 bg-gray-700 text-white"
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
              placeholder="Buscar..."
              id="busqueda-simple"
              value={busqueda}
              onChange={manejarBusqueda}
              className="pl-10  text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        {mostrarModal && (
          <ModalAñadirCliente
            onCancel={cerrarModal}
            onSubmit={() => {
              fetchClientes();
              cerrarModal();
            }}
            onSuccess={mostrarMensajeExito}
          />
        )}
      </div>

      <div className="px-4 pb-2 text-sm  text-gray-400">
        Mostrando {clientesPaginados.length} de {clientesFiltrados.length}{" "}
        resultados
      </div>

      <table className="w-full text-sm text-left  text-gray-400">
        <thead className="text-xs  uppercase  bg-gray-700 text-gray-400">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Cédula / Pasaporte</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Dirección</th>
            <th className="px-4 py-3">Sucursal</th>
            {(puedeEditar || puedeEliminar) && (
              <th className="px-4 py-3">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {clientesPaginados.map((cliente) => (
            <tr key={cliente.id} className="border-b border-gray-700">
              <td className="px-4 py-3 font-medium  whitespace-nowrap text-white">
                {cliente.codigo_referencia || "—"}
              </td>
              <td className="px-4 py-3">{cliente.nombre}</td>
              <td className="px-4 py-3">{cliente.identificacion || "—"}</td>
              <td className="px-4 py-3">{cliente.email}</td>
              <td className="px-4 py-3">{cliente.telefono}</td>
              <td className="px-4 py-3">{cliente.direccion}</td>

              <td className="px-4 py-3">
                {sucursalesMap[cliente.sucursal_id] || "—"}
              </td>

              {(puedeEditar || puedeEliminar) && (
                <td className="px-4 py-3 flex space-x-2">
                  {puedeEditar && (
                    <BotonIcono
                      tipo="editar"
                      onClick={() => {
                        iniciarEdicion(cliente);
                        setMostrarModalEditar(true);
                      }}
                      titulo="Editar cliente"
                    />
                  )}

                  {puedeEliminar && (
                    <BotonIcono
                      tipo="eliminar"
                      onClick={() => {
                        setClienteAEliminar(cliente);
                        setMostrarConfirmacion(true);
                      }}
                      titulo="Eliminar cliente"
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Paginacion
        paginaActual={page}
        totalPaginas={totalPaginasCalculadas}
        onCambiarPagina={setPage}
      />

      <ModalConfirmacion
        visible={mostrarConfirmacion}
        onClose={() => setMostrarConfirmacion(false)}
        onConfirmar={async () => {
          await eliminarCliente(clienteAEliminar.id);
          setMostrarConfirmacion(false);
          mostrarMensajeExito({
            titulo: "Cliente eliminado",
            mensaje: "El cliente ha sido eliminado correctamente.",
            textoBoton: "Cerrar",
          });
        }}
        titulo="¿Eliminar cliente?"
        mensaje={`¿Seguro que deseas eliminar a ${clienteAEliminar?.nombre}? Esta acción no se puede deshacer.`}
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

      {mostrarModalEditar && (
        <ModalEditar
          titulo="Editar Cliente"
          campos={[
            { name: "nombre", label: "Nombre" },
            { name: "email", label: "Email", type: "email" },
            { name: "telefono", label: "Teléfono" },
            { name: "direccion", label: "Dirección" },
            { name: "identificacion", label: "Cédula / Pasaporte" },
            {
              name: "sucursal_id",
              label: "Sucursal",
              type: "select",
              options: sucursales.map((s) => ({
                value: s.id,
                label: s.nombre,
              })),
            },
          ]}
          datosIniciales={clienteEditado}
          onSubmit={guardarClienteEditado}
          onCancel={() => {
            setMostrarModalEditar(false);
            cancelarEdicion();
          }}
        />
      )}
    </div>
  );
}

export default ListaClientes;
