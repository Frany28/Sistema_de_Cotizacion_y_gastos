// src/components/UsuariosCRUD.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../api/index";
import BotonIcono from "../components/general/BotonIcono";
import BotonAgregar from "../components/general/BotonAgregar";
import Paginacion from "../components/general/Paginacion";
import Loader from "../components/general/Loader";
import ModalCrearUsuario from "../components/Modals/ModalCrearUsuario";
import ModalEditarUsuario from "../components/Modals/ModalEditarUsuario";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront";

export default function UsuariosCRUD() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("usuariosLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [loading, setLoading] = useState(true);

  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);

  // Estados para eliminación
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [usuarioEliminarId, setUsuarioEliminarId] = useState(null);

  // Estados para éxito/error de borrado
  const [showDeleteExito, setShowDeleteExito] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");

  const [roles, setRoles] = useState([]);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/usuarios", {
        withCredentials: true,
      });
      setUsuarios(
        Array.isArray(response.data) ? response.data : response.data.usuarios
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get("/roles", { withCredentials: true });
      setRoles(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, [fetchUsuarios]);

  useEffect(() => {
    (async () => {
      setPuedeCrear(await verificarPermisoFront("crearUsuario"));
      setPuedeEditar(await verificarPermisoFront("editarUsuario"));
      setPuedeEliminar(await verificarPermisoFront("eliminarUsuario"));
    })();
  }, []);

  const manejarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPage(1);
  };

  const cambiarLimite = (nuevo) => {
    setLimit(nuevo);
    localStorage.setItem("usuariosLimit", nuevo);
    setPage(1);
  };

  const abrirModalEditar = async (id) => {
    try {
      const { data } = await api.get(`/usuarios/${id}`, {
        withCredentials: true,
      });
      setUsuarioEditar(data);
      setShowModalEditar(true);
    } catch (error) {
      console.error(error);
    }
  };

  const abrirModalEliminar = (id) => {
    const u = usuarios.find((u) => u.id === id);
    if (u?.estado !== "inactivo") {
      setDeleteErrorMsg("Solo usuarios inactivos pueden eliminarse");
      setShowDeleteError(true);
      return;
    }
    setUsuarioEliminarId(id);
    setShowModalEliminar(true);
  };

  const handleConfirmEliminar = async () => {
    try {
      await api.delete(`/usuarios/${usuarioEliminarId}`, {
        withCredentials: true,
      });
      setShowModalEliminar(false);
      setShowDeleteExito(true);
      fetchUsuarios();
    } catch (error) {
      setShowModalEliminar(false);
      setDeleteErrorMsg(
        error.response?.data?.error || "Error al eliminar usuario"
      );
      setShowDeleteError(true);
    }
  };

  const handleDeleteExitoClose = () => {
    setShowDeleteExito(false);
  };

  const handleDeleteErrorClose = () => {
    setShowDeleteError(false);
  };

  // Filtrado y paginado
  const filtrados = usuarios.filter((u) =>
    ["codigo", "nombre", "email", "rol", "estado"].some((campo) =>
      u[campo]?.toLowerCase().includes(busqueda.toLowerCase())
    )
  );
  const totalPaginas = Math.ceil(filtrados.length / limit);
  const paginados = filtrados.slice((page - 1) * limit, page * limit);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  return (
    <div>
      {/* Modales de éxito/error borrado */}
      <ModalExito
        visible={showDeleteExito}
        onClose={handleDeleteExitoClose}
        titulo="Usuario eliminado"
        mensaje="El usuario se borró correctamente"
        textoBoton="Continuar"
      />
      <ModalError
        visible={showDeleteError}
        onClose={handleDeleteErrorClose}
        titulo="Error"
        mensaje={deleteErrorMsg}
        textoBoton="Entendido"
      />

      {/* Crear usuario */}
      <ModalCrearUsuario
        visible={showModalCrear}
        onCancel={() => setShowModalCrear(false)}
        onSuccess={() => {
          setShowModalCrear(false);
          fetchUsuarios();
        }}
      />

      {/* Editar usuario */}
      <ModalEditarUsuario
        visible={showModalEditar}
        onClose={() => setShowModalEditar(false)}
        usuario={usuarioEditar}
        roles={roles}
        onUsuarioActualizado={() => {
          setShowModalEditar(false);
          fetchUsuarios();
        }}
      />

      {/* Confirmación eliminación */}
      <ModalConfirmacion
        visible={showModalEliminar}
        onClose={() => setShowModalEliminar(false)}
        onConfirmar={handleConfirmEliminar}
        titulo="Eliminar usuario"
        mensaje="¿Deseas eliminar este usuario?"
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
      />

      {/* Controles de búsqueda y paginación */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 p-4 gap-2">
        {puedeCrear && (
          <BotonAgregar
            onClick={() => setShowModalCrear(true)}
            texto="Nuevo Usuario"
          />
        )}

        <div className="flex flex-col sm:flex-row w-full md:w-1/2 gap-2">
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
              className="cursor-pointer text-sm rounded-md border border-gray-600 bg-gray-700 text-white"
            >
              {[5, 10, 25].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
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
              className="pl-10 border rounded-lg text-sm focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="px-4 pb-2 text-sm text-gray-400">
        Mostrando {paginados.length} de {filtrados.length} resultados
      </div>

      {/* Vista de tabla para pantallas grandes */}
      <div className="hidden lg:block">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs uppercase bg-gray-700 text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Creado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((u) => (
              <tr key={u.id} className="border-b border-gray-700">
                <td className="px-4 py-3 font-medium text-white">
                  {u.codigo || `USR${String(u.id).padStart(4, "0")}`}
                </td>
                <td className="px-4 py-3">{u.nombre}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.rol}</td>
                <td className="px-4 py-3 capitalize">{u.estado}</td>
                <td className="px-4 py-3">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 flex space-x-2">
                  {puedeEditar && (
                    <BotonIcono
                      tipo="editar"
                      onClick={() => abrirModalEditar(u.id)}
                      titulo="Editar usuario"
                    />
                  )}
                  {puedeEliminar && (
                    <BotonIcono
                      tipo="eliminar"
                      onClick={() => abrirModalEliminar(u.id)}
                      titulo="Eliminar usuario"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas para tablets */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-1 gap-4 p-2">
          {paginados.map((u) => (
            <div key={u.id} className="bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white">
                    {u.codigo || `USR${String(u.id).padStart(4, "0")}`}
                  </h3>
                  <p className="text-sm text-gray-400">{u.nombre}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    u.estado === "activo"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {u.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white ml-1">{u.email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rol:</span>
                  <span className="text-white ml-1">{u.rol}</span>
                </div>
                <div>
                  <span className="text-gray-400">Creado:</span>
                  <span className="text-white ml-1">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-3">
                {puedeEditar && (
                  <BotonIcono
                    tipo="editar"
                    small
                    onClick={() => abrirModalEditar(u.id)}
                    titulo="Editar usuario"
                  />
                )}
                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    small
                    onClick={() => abrirModalEliminar(u.id)}
                    titulo="Eliminar usuario"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden space-y-3 p-2">
        {paginados.map((u) => (
          <div key={u.id} className="bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">
                  {u.codigo || `USR${String(u.id).padStart(4, "0")}`}
                </h3>
                <p className="text-sm text-gray-400">{u.nombre}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  u.estado === "activo"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {u.estado}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-3 text-sm">
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-1">{u.email}</span>
              </div>
              <div>
                <span className="text-gray-400">Rol:</span>
                <span className="text-white ml-1">{u.rol}</span>
              </div>
              <div>
                <span className="text-gray-400">Estado:</span>
                <span className="text-white ml-1 capitalize">{u.estado}</span>
              </div>
              <div>
                <span className="text-gray-400">Creado:</span>
                <span className="text-white ml-1">
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-3">
              {puedeEditar && (
                <BotonIcono
                  tipo="editar"
                  small
                  onClick={() => abrirModalEditar(u.id)}
                  titulo="Editar usuario"
                />
              )}
              {puedeEliminar && (
                <BotonIcono
                  tipo="eliminar"
                  small
                  onClick={() => abrirModalEliminar(u.id)}
                  titulo="Eliminar usuario"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <Paginacion
        paginaActual={page}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPage}
      />
    </div>
  );
}
