// src/components/ListaProveedores.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../api/index";
import BotonIcono from "./general/BotonIcono";
import BotonAgregar from "../components/general/BotonAgregar";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";
import Paginacion from "../components/general/Paginacion";
import Loader from "./general/Loader";
import ModalAñadirProveedor from "../components/Modals/ModalAñadirProveedor";
import ModalEditar from "../components/Modals/ModalEditar";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront";

function ListaProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("proveedoresLimit");
    return stored ? parseInt(stored, 10) : 25;
  });

  const [loading, setLoading] = useState(true);
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);
  const [editandoProveedor, setEditandoProveedor] = useState(null);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [total, setTotal] = useState(0);
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
  const [proveedorEditado, setProveedorEditado] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    rif: "",
    estado: "activo",
  });

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

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      /* 2) UNA sola llamada, sin filtros */
      const { data } = await api.get("/proveedores"); // GET /proveedores

      if (data && Array.isArray(data.proveedores)) {
        setProveedores(data.proveedores); // lista completa
        setTotal(data.proveedores.length); // total local
      } else {
        console.warn("Respuesta inesperada:", data);
        throw new Error("Formato de respuesta no válido");
      }
    } catch (error) {
      console.error("Error al obtener proveedores:", error);
      mostrarError({
        titulo: "Error al obtener proveedores",
        mensaje: "No se pudieron cargar los datos desde el servidor.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEliminarClick = (prov) => {
    if (prov.estado === "activo") {
      mostrarError({
        titulo: "No permitido",
        mensaje:
          "El proveedor está ACTIVO; cámbialo a INACTIVO antes de eliminar.",
      });
      return;
    }
    setProveedorAEliminar(prov);
  };

  /* ---------- 1. Cargar permisos UNA vez ---------- */
  useEffect(() => {
    const cargarPermisos = async () => {
      try {
        const [crear, editar, eliminar] = await Promise.all([
          verificarPermisoFront("crearProveedor"),
          verificarPermisoFront("editarProveedor"),
          verificarPermisoFront("eliminarProveedor"),
        ]);
        setPuedeCrear(crear);
        setPuedeEditar(editar);
        setPuedeEliminar(eliminar);
      } catch (e) {
        console.error("Error obteniendo permisos:", e);
      }
    };

    cargarPermisos();
  }, []);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const manejarBusqueda = (e) => {
    const termino = e.target.value;
    setBusqueda(termino);
    setPage(1);
  };

  const proveedoresFiltrados = proveedores.filter((p) =>
    ["nombre", "email", "telefono", "direccion", "rif"].some((campo) =>
      p[campo]?.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const proveedoresPaginados = proveedoresFiltrados.slice(
    (page - 1) * limit,
    page * limit
  );
  const totalPaginas = Math.ceil(proveedoresFiltrados.length / limit);

  const abrirModal = () => setMostrarModal(true);
  const cerrarModal = () => setMostrarModal(false);

  const iniciarEdicion = (proveedor) => {
    setEditandoProveedor(proveedor);
    setProveedorEditado({
      nombre: proveedor.nombre || "",
      email: proveedor.email || "",
      telefono: proveedor.telefono || "",
      direccion: proveedor.direccion || "",
      rif: proveedor.rif || "",
      estado: proveedor.estado || "activo",
    });
  };

  const cancelarEdicion = () => {
    setEditandoProveedor(null);
  };

  const eliminarProveedor = async (id) => {
    try {
      await api.delete(`/proveedores/${id}`);
      setProveedores(proveedores.filter((p) => p.id !== id));
    } catch (error) {
      if (error.response?.status === 409) {
        mostrarError({
          titulo: "No permitido",
          mensaje:
            error.response.data?.message ||
            "El proveedor está ACTIVO; no puede eliminarse.",
        });
      } else {
        console.error("Error al eliminar proveedor:", error);
        mostrarError({
          titulo: "Error al eliminar proveedor",
          mensaje: "No se pudo eliminar el proveedor. Intenta nuevamente.",
        });
      }
    }
  };

  const guardarProveedorEditado = async (datos) => {
    try {
      const response = await api.put(
        `/proveedores/${editandoProveedor.id}`,
        datos
      );
      const actualizado = response.data;
      const nuevosProveedores = proveedores.map((p) =>
        p.id === editandoProveedor.id ? { ...p, ...datos } : p
      );
      setProveedores(nuevosProveedores);
      setEditandoProveedor(null);
      setMostrarModalEditar(false);
      mostrarMensajeExito({
        titulo: "Proveedor actualizado",
        mensaje: `Los datos de ${datos.nombre} se han actualizado correctamente.`,
      });
    } catch (error) {
      console.error("Error al editar proveedor:", error);
      mostrarError({
        titulo: "Error al actualizar proveedor",
        mensaje: "Ocurrió un error al actualizar el proveedor.",
      });
    }
  };

  const cambiarLimite = (nuevoLimite) => {
    setLimit(nuevoLimite);
    localStorage.setItem("proveedoresLimit", nuevoLimite);
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
        {puedeCrear && (
          <BotonAgregar onClick={abrirModal} texto="Nuevo Proveedor" />
        )}

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
              value={busqueda}
              onChange={manejarBusqueda}
              className="pl-10   text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        {mostrarModal && puedeCrear && (
          <ModalAñadirProveedor
            onCancel={cerrarModal}
            onSubmit={() => {
              fetchProveedores();
              cerrarModal();
            }}
            onSuccess={mostrarMensajeExito}
          />
        )}
      </div>

      <div className="px-4 pb-2 text-sm  text-gray-400">
        Mostrando {proveedoresPaginados.length} de {proveedoresFiltrados.length}{" "}
        resultados
      </div>

      <table className="w-full text-sm text-left  text-gray-400">
        <thead className="text-xs  uppercase  bg-gray-700 text-gray-400">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Dirección</th>
            <th className="px-4 py-3">Estado</th>
            {(puedeEditar || puedeEliminar) && (
              <th className="px-4 py-3">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {proveedoresPaginados.map((p) => (
            <tr key={p.id} className="border-b border-gray-700">
              <td className="px-4 py-3">{p.rif}</td>
              <td className="px-4 py-3">{p.nombre}</td>
              <td className="px-4 py-3">{p.email}</td>
              <td className="px-4 py-3">{p.telefono}</td>
              <td className="px-4 py-3">{p.direccion || "—"}</td>
              <td className="px-4 py-3">{p.estado}</td>
              <td className="px-4 py-3 flex space-x-2">
                <BotonIcono
                  tipo="editar"
                  onClick={() => {
                    iniciarEdicion(p);
                    setMostrarModalEditar(true);
                  }}
                  titulo="Editar proveedor"
                />
                <BotonIcono
                  tipo="eliminar"
                  onClick={() => handleEliminarClick(p)}
                  titulo="Eliminar proveedor"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Paginacion
        paginaActual={page}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPage}
      />

      <ModalConfirmacion
        visible={!!proveedorAEliminar}
        onClose={() => setProveedorAEliminar(null)}
        onConfirmar={async () => {
          await eliminarProveedor(proveedorAEliminar.id);
          setProveedorAEliminar(null);
          mostrarMensajeExito({
            titulo: "Proveedor eliminado",
            mensaje: "El proveedor ha sido eliminado correctamente.",
          });
        }}
        titulo="¿Eliminar proveedor?"
        mensaje={`¿Seguro que deseas eliminar a ${proveedorAEliminar?.nombre}? Esta acción no se puede deshacer.`}
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
          titulo="Editar Proveedor"
          campos={[
            { name: "nombre", label: "Nombre" },
            { name: "email", label: "Email", type: "email" },
            { name: "telefono", label: "Teléfono" },
            { name: "direccion", label: "Dirección" },
            { name: "rif", label: "RIF" },
            {
              name: "estado",
              label: "Estado",
              type: "select",
              options: ["activo", "inactivo"],
            },
          ]}
          datosIniciales={proveedorEditado}
          onSubmit={guardarProveedorEditado}
          onCancel={() => {
            setMostrarModalEditar(false);
            cancelarEdicion();
          }}
        />
      )}
    </div>
  );
}

export default ListaProveedores;
