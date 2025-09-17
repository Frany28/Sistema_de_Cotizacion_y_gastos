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
  // Estado principal
  const [sucursales, setSucursales] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Filtros / UI
  const [busqueda, setBusqueda] = useState("");

  // Paginación (servidor)
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(() => {
    const almacenado = localStorage.getItem("sucursalesLimit");
    return almacenado ? parseInt(almacenado, 10) : 5;
  });

  // Carga
  const [cargando, setCargando] = useState(true);

  // Modales crear/editar
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [sucursalEditar, setSucursalEditar] = useState(null);

  // Permisos
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);

  // Eliminar
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [sucursalEliminarId, setSucursalEliminarId] = useState(null);

  // Éxito / error al eliminar
  const [mostrarEliminarExito, setMostrarEliminarExito] = useState(false);
  const [mostrarEliminarError, setMostrarEliminarError] = useState(false);
  const [mensajeEliminarError, setMensajeEliminarError] = useState("");

  // Traer sucursales (paginadas desde servidor)
  const obtenerSucursales = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get("/sucursales", {
        params: { page: pagina, limit: limite },
        withCredentials: true,
      });
      const lista = Array.isArray(data) ? data : data.sucursales || [];
      setSucursales(lista);
      setTotalRegistros(Number(data?.total ?? lista.length));
    } catch (error) {
      console.error("Error obteniendo sucursales:", error);
    } finally {
      setCargando(false);
    }
  }, [pagina, limite]);

  // Cargar al montar y cuando cambia paginación
  useEffect(() => {
    obtenerSucursales();
  }, [obtenerSucursales]);

  // Verificar permisos una vez
  useEffect(() => {
    (async () => {
      setPuedeCrear(await verificarPermisoFront("crearSucursal"));
      setPuedeEditar(await verificarPermisoFront("editarSucursal"));
      setPuedeEliminar(await verificarPermisoFront("eliminarSucursal"));
    })();
  }, []);

  // Handlers
  const manejarBusqueda = (evento) => {
    setBusqueda(evento.target.value);
    // OJO: búsqueda local sobre la página actual
    // Si quieres búsqueda global, ver notas al final para llevarla al servidor.
  };

  const cambiarLimite = (nuevoLimite) => {
    setLimite(nuevoLimite);
    localStorage.setItem("sucursalesLimit", nuevoLimite);
    setPagina(1);
  };

  const abrirModalEditar = async (id) => {
    try {
      const { data } = await api.get(`/sucursales/${id}`, {
        withCredentials: true,
      });
      setSucursalEditar(data);
      setMostrarModalEditar(true);
    } catch (error) {
      console.error("Error abriendo modal editar:", error);
    }
  };

  const abrirModalEliminar = (sucursal) => {
    if (sucursal?.estado === "activo") {
      setMensajeEliminarError(
        "No puedes eliminar una sucursal activa. Cámbiala a inactivo primero."
      );
      setMostrarEliminarError(true);
      return;
    }
    setSucursalEliminarId(sucursal?.id);
    setMostrarModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/sucursales/${sucursalEliminarId}`, {
        withCredentials: true,
      });
      setMostrarModalEliminar(false);
      setMostrarEliminarExito(true);
      obtenerSucursales();
    } catch (error) {
      setMostrarModalEliminar(false);
      setMensajeEliminarError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Error al eliminar sucursal"
      );
      setMostrarEliminarError(true);
    }
  };

  // Derivados
  const sucursalesFiltradas = sucursales.filter((s) =>
    ["codigo", "nombre", "direccion", "ciudad", "responsable"].some((campo) =>
      s?.[campo]?.toLowerCase?.().includes(busqueda.toLowerCase())
    )
  );

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  return (
    <div>
      {/* Modales de éxito/error al eliminar */}
      <ModalExito
        visible={mostrarEliminarExito}
        onClose={() => setMostrarEliminarExito(false)}
        titulo="Sucursal eliminada"
        mensaje="La sucursal se borró correctamente"
        textoBoton="Continuar"
      />
      <ModalError
        visible={mostrarEliminarError}
        onClose={() => setMostrarEliminarError(false)}
        titulo="Error"
        mensaje={mensajeEliminarError}
        textoBoton="Entendido"
      />

      {/* Crear sucursal */}
      <ModalCrearSucursal
        visible={mostrarModalCrear}
        onCancel={() => setMostrarModalCrear(false)}
        onSuccess={() => {
          setMostrarModalCrear(false);
          obtenerSucursales();
        }}
      />

      {/* Editar sucursal */}
      <ModalEditarSucursal
        visible={mostrarModalEditar}
        onClose={() => setMostrarModalEditar(false)}
        sucursal={sucursalEditar}
        onSucursalActualizada={() => {
          setMostrarModalEditar(false);
          obtenerSucursales();
        }}
      />

      {/* Confirmación eliminación */}
      <ModalConfirmacion
        visible={mostrarModalEliminar}
        onClose={() => setMostrarModalEliminar(false)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar sucursal"
        mensaje="¿Deseas eliminar esta sucursal?"
        textoConfirmar="Sí, eliminar"
        textoCancelar="Cancelar"
      />

      {/* Controles: crear, mostrar y búsqueda */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 p-4 gap-2">
        {puedeCrear && (
          <BotonAgregar
            onClick={() => setMostrarModalCrear(true)}
            texto="Nueva Sucursal"
          />
        )}

        <div className="flex flex-col sm:flex-row w-full md:w-1/2 gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="selectorCantidad"
              className="text-sm text-gray-300 font-medium"
            >
              Mostrar:
            </label>
            <select
              id="selectorCantidad"
              value={limite}
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
              placeholder="Buscar sucursales..."
              value={busqueda}
              onChange={manejarBusqueda}
              className="pl-10 border rounded-lg text-sm focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="px-4 pb-2 text-sm text-gray-400">
        Mostrando {sucursalesFiltradas.length} de {totalRegistros} registros
      </div>

      {/* === Tabla (desktop, ≥ lg) === */}
      <div className="hidden lg:block">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs uppercase bg-gray-700 text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sucursalesFiltradas.map((s) => (
              <tr key={s.id} className="border-b border-gray-700">
                <td className="px-4 py-3 font-medium text-white">{s.codigo}</td>
                <td className="px-4 py-3">{s.nombre}</td>
                <td className="px-4 py-3">{s.direccion}</td>
                <td className="px-4 py-3">{s.ciudad || "-"}</td>
                <td className="px-4 py-3">{s.responsable || "-"}</td>
                <td className="px-4 py-3 capitalize">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      s.estado === "activo"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {s.estado || "-"}
                  </span>
                </td>
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

      {/* === Tarjetas en grid (tablet, md) === */}
      <div className="hidden md:block lg:hidden">
        <div className="grid grid-cols-1 gap-4 p-2">
          {sucursalesFiltradas.map((s) => (
            <div key={s.id} className="bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-white">{s.codigo}</h3>
                  <p className="text-sm text-gray-400">{s.nombre}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    s.estado === "activo"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {s.estado || "-"}
                </span>
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
                <div>
                  <span className="text-gray-400">Teléfono:</span>
                  <span className="text-white ml-1">{s.telefono || "-"}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-3">
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
          ))}
        </div>
      </div>

      {/* === Tarjetas apiladas (móvil) === */}
      <div className="md:hidden space-y-3 p-2">
        {sucursalesFiltradas.map((s) => (
          <div key={s.id} className="bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-white">{s.codigo}</h3>
                <p className="text-sm text-gray-400">{s.nombre}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  s.estado === "activo"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {s.estado || "-"}
              </span>
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
              <div>
                <span className="text-gray-400">Teléfono:</span>
                <span className="text-white ml-1">{s.telefono || "-"}</span>
              </div>
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="text-white ml-1">{s.email || "-"}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-3">
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
        ))}
      </div>

      {/* Paginación */}
      <Paginacion
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        onCambiarPagina={setPagina}
      />
    </div>
  );
}
