// src/components/SucursalesCRUD.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../api/index";
import BotonIcono from "../components/general/BotonIcono";
import BotonAgregar from "../components/general/BotonAgregar";
import Paginacion from "../components/general/Paginacion";
import Loader from "../components/general/Loader";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront";

import ModalConfirmacion from "../components/Modals/ModalConfirmacion";
import ModalCrearSucursal from "./Modals/ModalCrearSucursal";
import ModalEditarSucursal from "./Modals/ModalEditarSucursal";
import ModalExito from "../components/Modals/ModalExito";
import ModalError from "../components/Modals/ModalError";

export default function SucursalesCRUD() {
  const [sucursales, setSucursales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("sucursalesLimit");
    return stored ? parseInt(stored, 10) : 5;
  });
  const [loading, setLoading] = useState(true);

  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [sucursalEditar, setSucursalEditar] = useState(null);
  // Verificar permisos
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);

  // Estados para eliminación
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [sucursalEliminarId, setSucursalEliminarId] = useState(null);

  // Estados para éxito/error de borrado
  const [showDeleteExito, setShowDeleteExito] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");

  const fetchSucursales = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sucursales", {
        params: { page, limit },
        withCredentials: true,
      });
      setSucursales(response.data.sucursales || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchSucursales();
  }, [fetchSucursales]);

  useEffect(() => {
    (async () => {
      setPuedeCrear(await verificarPermisoFront("crearSucursal"));
      setPuedeEditar(await verificarPermisoFront("editarSucursal"));
      setPuedeEliminar(await verificarPermisoFront("eliminarSucursal"));
    })();
  }, []);

  const manejarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPage(1);
  };

  const cambiarLimite = (nuevo) => {
    setLimit(nuevo);
    localStorage.setItem("sucursalesLimit", nuevo);
    setPage(1);
  };

  const abrirModalEditar = async (id) => {
    const { data } = await api.get(`/sucursales/${id}`, {
      withCredentials: true,
    });
    setSucursalEditar(data);
    setShowModalEditar(true);
  };

  const abrirModalEliminar = (sucursal) => {
    if (sucursal.estado === "activo") {
      setDeleteErrorMsg(
        "No puedes eliminar una sucursal activa. Cámbiala a inactivo primero."
      );
      setShowDeleteError(true);
      return;
    }
    setSucursalEliminarId(sucursal.id);
    setShowModalEliminar(true);
  };

  const handleConfirmEliminar = async () => {
    try {
      await api.delete(`/sucursales/${sucursalEliminarId}`, {
        withCredentials: true,
      });
      setShowModalEliminar(false);
      setShowDeleteExito(true);
      fetchSucursales();
    } catch (error) {
      setShowModalEliminar(false);
      setDeleteErrorMsg(
        error.response?.data?.error || "Error al eliminar sucursal"
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
  const filtrados = sucursales.filter((s) =>
    ["codigo", "nombre", "direccion", "ciudad", "responsable"].some((campo) =>
      s[campo]?.toLowerCase().includes(busqueda.toLowerCase())
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
        titulo="Sucursal eliminada"
        mensaje="La sucursal se borró correctamente"
        textoBoton="Continuar"
      />
      <ModalError
        visible={showDeleteError}
        onClose={handleDeleteErrorClose}
        titulo="Error"
        mensaje={deleteErrorMsg}
        textoBoton="Entendido"
      />

      {/* Crear sucursal */}
      <ModalCrearSucursal
        visible={showModalCrear}
        onCancel={() => setShowModalCrear(false)}
        onSuccess={() => {
          setShowModalCrear(false);
          fetchSucursales();
        }}
      />

      {/* Editar sucursal */}
      <ModalEditarSucursal
        visible={showModalEditar}
        onClose={() => setShowModalEditar(false)}
        sucursal={sucursalEditar}
        onSucursalActualizada={() => {
          setShowModalEditar(false);
          fetchSucursales();
        }}
      />

      {/* Confirmación eliminación */}
      <ModalConfirmacion
        visible={showModalEliminar}
        onClose={() => setShowModalEliminar(false)}
        onConfirmar={handleConfirmEliminar}
        titulo="Eliminar sucursal"
        mensaje="¿Deseas eliminar esta sucursal?"
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
      />

      {/* Controles de búsqueda y paginación */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 p-4 gap-2">
        {puedeCrear && (
          <BotonAgregar
            onClick={() => setShowModalCrear(true)}
            texto="Nueva Sucursal"
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
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((s) => (
              <tr key={s.id} className="border-b border-gray-700">
                <td className="px-4 py-3 font-medium text-white">{s.codigo}</td>
                <td className="px-4 py-3">{s.nombre}</td>
                <td className="px-4 py-3">{s.direccion}</td>
                <td className="px-4 py-3">{s.ciudad || "-"}</td>
                <td className="px-4 py-3">{s.responsable || "-"}</td>
                <td className="px-4 py-3 flex space-x-2">
                  {puedeEditar && (
                    <BotonIcono
                      tipo="editar"
                      onClick={() => abrirModalEditar(s.id)}
                      titulo="Editar sucursal"
                    />
                  )}
                  {puedeEliminar && (
                    <BotonIcono
                      tipo="eliminar"
                      onClick={() => abrirModalEliminar(s)}
                      titulo="Eliminar sucursal"
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
          {paginados.map((s) => (
            <div key={s.id} className="bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white">{s.codigo}</h3>
                  <p className="text-sm text-gray-400">{s.nombre}</p>
                </div>
                <div className="flex space-x-2">
                  {puedeEditar && (
                    <BotonIcono
                      tipo="editar"
                      small
                      onClick={() => abrirModalEditar(s.id)}
                      titulo="Editar sucursal"
                    />
                  )}
                  {puedeEliminar && (
                    <BotonIcono
                      tipo="eliminar"
                      small
                      onClick={() => abrirModalEliminar(s)}
                      titulo="Eliminar sucursal"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-gray-400">Dirección:</span>
                  <span className="text-white ml-1">{s.direccion}</span>
                </div>
                <div>
                  <span className="text-gray-400">Ciudad:</span>
                  <span className="text-white ml-1">{s.ciudad || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Responsable:</span>
                  <span className="text-white ml-1">
                    {s.responsable || "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden space-y-3 p-2">
        {paginados.map((s) => (
          <div key={s.id} className="bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">{s.codigo}</h3>
                <p className="text-sm text-gray-400">{s.nombre}</p>
              </div>
              <div className="flex space-x-2">
                {puedeEditar && (
                  <BotonIcono
                    tipo="editar"
                    small
                    onClick={() => abrirModalEditar(s.id)}
                    titulo="Editar sucursal"
                  />
                )}
                {puedeEliminar && (
                  <BotonIcono
                    tipo="eliminar"
                    small
                    onClick={() => abrirModalEliminar(s)}
                    titulo="Eliminar sucursal"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-3 text-sm">
              <div>
                <span className="text-gray-400">Dirección:</span>
                <span className="text-white ml-1">{s.direccion}</span>
              </div>
              <div>
                <span className="text-gray-400">Ciudad:</span>
                <span className="text-white ml-1">{s.ciudad || "-"}</span>
              </div>
              <div>
                <span className="text-gray-400">Responsable:</span>
                <span className="text-white ml-1">{s.responsable || "-"}</span>
              </div>
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
