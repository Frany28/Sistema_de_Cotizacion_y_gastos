// src/components/BancosCRUD.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../api/index";
import { verificarPermisoFront } from "../../utils/verificarPermisoFront.js";

import ModalAñadirBanco from "../components/Modals/ModalAñadirBanco";
import BotonIcono from "./general/BotonIcono";
import BotonAgregar from "../components/general/BotonAgregar";
import ModalConfirmacion from "../components/Modals/ModalConfirmacion.jsx";
import ModalExito from "../components/Modals/ModalExito";
import ModalEditar from "../components/Modals/ModalEditar";
import ModalError from "../components/Modals/ModalError";
import Paginacion from "../components/general/Paginacion";
import Loader from "./general/Loader";

function BancosCRUD() {
  const [bancos, setBancos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => {
    const stored = localStorage.getItem("bancosLimit");
    return stored ? parseInt(stored, 10) : 5;
  });

  const [loading, setLoading] = useState(true);

  // Permisos de usuario
  const [puedeCrear, setPuedeCrear] = useState(false);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeEliminar, setPuedeEliminar] = useState(false);

  useEffect(() => {
    const fetchPermisos = async () => {
      try {
        const [crear, editar, eliminar, _] = await Promise.all([
          verificarPermisoFront("crearBanco"),
          verificarPermisoFront("editarBanco"),
          verificarPermisoFront("eliminarBanco"),
          verificarPermisoFront("verBancos"),
        ]);
        setPuedeCrear(crear);
        setPuedeEditar(editar);
        setPuedeEliminar(eliminar);
      } catch (err) {
        console.error("Error verificando permisos:", err);
      }
    };
    fetchPermisos();
  }, []);

  const [mostrarModalAdd, setMostrarModalAdd] = useState(false);
  const [editandoBanco, setEditandoBanco] = useState(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [bancoAEliminar, setBancoAEliminar] = useState(null);

  const [modalExito, setModalExito] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    textoBoton: "Entendido",
  });
  const [modalError, setModalError] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    textoBoton: "Cerrar",
  });

  const [datosEdicion, setDatosEdicion] = useState({
    nombre: "",
    moneda: "VES",
    tipo_identificador: "nro_cuenta",
    identificador: "",
    estado: "activo",
  });

  const mostrarMensajeExito = ({ titulo, mensaje, textoBoton }) => {
    setModalExito({ visible: true, titulo, mensaje, textoBoton });
  };
  const mostrarMensajeError = ({ titulo, mensaje, textoBoton }) => {
    setModalError({ visible: true, titulo, mensaje, textoBoton });
  };

  const fetchBancos = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get("/bancos");
      setBancos(Array.isArray(resp.data.bancos) ? resp.data.bancos : []);
    } catch (err) {
      console.error(err);
      mostrarMensajeError({
        titulo: "Error cargando bancos",
        mensaje: "No fue posible obtener los datos.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBancos();
  }, [fetchBancos]);

  const manejarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPage(1);
  };

  const abrirAdd = () => setMostrarModalAdd(true);
  const cerrarAdd = () => setMostrarModalAdd(false);

  const iniciarEdicion = (banco) => {
    setEditandoBanco(banco);
    setDatosEdicion({
      nombre: banco.nombre,
      moneda: banco.moneda,
      tipo_identificador: banco.tipo_identificador,
      identificador: banco.identificador,
      estado: banco.estado,
    });
    setMostrarModalEditar(true);
  };

  const confirmarEliminacion = (banco) => {
    setBancoAEliminar(banco);
    setMostrarConfirm(true);
  };

  const eliminarBanco = async () => {
    try {
      await api.delete(`/bancos/${bancoAEliminar.id}`);
      setBancos(bancos.filter((b) => b.id !== bancoAEliminar.id));
      mostrarMensajeExito({
        titulo: "Banco eliminado",
        mensaje: "Se eliminó el banco correctamente.",
        textoBoton: "Cerrar",
      });
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        mostrarMensajeError({
          titulo: "Permiso denegado",
          mensaje: err.response.data.message,
        });
      } else {
        mostrarMensajeError({
          titulo: "Error al eliminar",
          mensaje: "No se pudo eliminar el banco.",
        });
      }
    } finally {
      setMostrarConfirm(false);
      setBancoAEliminar(null);
    }
  };

  const guardarEdicion = async (valores) => {
    try {
      await api.put(`/bancos/${editandoBanco.id}`, valores);
      await fetchBancos();
      mostrarMensajeExito({
        titulo: "Banco actualizado",
        mensaje: `El banco ${valores.nombre} se actualizó con éxito.`,
      });
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        mostrarMensajeError({
          titulo: "Permiso denegado",
          mensaje: err.response.data.message,
        });
        return;
      }
      mostrarMensajeError({
        titulo: "Error al actualizar",
        mensaje: "No se pudo actualizar el banco.",
      });
    } finally {
      setMostrarModalEditar(false);
      setEditandoBanco(null);
    }
  };

  // Filtrado y paginación
  const filtrados = bancos.filter((b) =>
    ["nombre", "moneda", "tipo_identificador", "identificador", "estado"].some(
      (campo) =>
        b[campo]?.toString().toLowerCase().includes(busqueda.toLowerCase())
    )
  );
  const totalPag = Math.ceil(filtrados.length / limit);
  const visibles = filtrados.slice((page - 1) * limit, page * limit);

  const cambiarLimit = (n) => {
    setLimit(n);
    localStorage.setItem("bancosLimit", n);
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
      {/* Barra superior: Nuevo + filtros */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 p-4 gap-2">
        {puedeCrear && <BotonAgregar onClick={abrirAdd} texto="Nuevo Banco" />}
        <div className="flex w-full md:w-1/2 gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="cantidad" className="text-sm text-gray-300">
              Mostrar:
            </label>
            <select
              id="cantidad"
              value={limit}
              onChange={(e) => cambiarLimit(+e.target.value)}
              className="cursor-pointer text-sm rounded-md border-gray-600 bg-gray-700 text-white"
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
              {/* icono búsqueda */}
              <svg
                className="w-5 h-5 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {/* … */}
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar bancos..."
              value={busqueda}
              onChange={manejarBusqueda}
              className="pl-8 w-full p-2.5 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-primary-600 focus:border-primary-600"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Bancos */}
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="bg-gray-700 uppercase text-gray-400 text-xs">
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Moneda</th>
            <th className="px-4 py-2">Tipo Ident.</th>
            <th className="px-4 py-2">Identificador</th>
            <th className="px-4 py-2">Estado</th>
            {(puedeEditar || puedeEliminar) && (
              <th className="px-4 py-2">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {visibles.map((banco) => (
            <tr key={banco.id} className="border-b border-gray-700">
              <td className="px-4 py-2 text-white">{banco.id}</td>
              <td className="px-4 py-2">{banco.nombre}</td>
              <td className="px-4 py-2">{banco.moneda}</td>
              <td className="px-4 py-2">{banco.tipo_identificador}</td>
              <td className="px-4 py-2">{banco.identificador}</td>
              <td className="px-4 py-2">{banco.estado}</td>
              {(puedeEditar || puedeEliminar) && (
                <td className="px-4 py-2 flex space-x-2">
                  {puedeEditar && (
                    <BotonIcono
                      tipo="editar"
                      onClick={() => iniciarEdicion(banco)}
                      titulo="Editar banco"
                    />
                  )}

                  {puedeEliminar && (
                    <BotonIcono
                      tipo="eliminar"
                      onClick={() => {
                        if (banco.estado === "activo") {
                          mostrarMensajeError({
                            titulo: "No permitido",
                            mensaje:
                              "No se puede eliminar un banco activo. Cámbialo a inactivo primero.",
                            textoBoton: "Cerrar",
                          });
                          return;
                        }
                        confirmarEliminacion(banco);
                      }}
                      disabled={banco.estado === "activo"}
                      titulo={
                        banco.estado === "activo"
                          ? "No se puede eliminar un banco activo"
                          : "Eliminar banco"
                      }
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginación */}
      <Paginacion
        paginaActual={page}
        totalPaginas={totalPag}
        onCambiarPagina={setPage}
      />

      {/* Modales */}
      {mostrarModalAdd && puedeCrear && (
        <ModalAñadirBanco
          onCancel={cerrarAdd}
          onSubmit={async (datos) => {
            await api.post("/bancos", datos);
            await fetchBancos();
            cerrarAdd();
            mostrarMensajeExito({
              titulo: "Banco creado",
              mensaje: "El banco se agregó correctamente.",
            });
          }}
        />
      )}

      <ModalConfirmacion
        visible={mostrarConfirm}
        onClose={() => setMostrarConfirm(false)}
        onConfirmar={eliminarBanco}
        titulo="¿Eliminar banco?"
        mensaje={`Vas a eliminar "${bancoAEliminar?.nombre}". Esta acción no se puede deshacer.`}
      />

      <ModalExito
        visible={modalExito.visible}
        onClose={() => setModalExito({ ...modalExito, visible: false })}
        titulo={modalExito.titulo}
        mensaje={modalExito.mensaje}
        textoBoton={modalExito.textoBoton}
      />

      <ModalError
        visible={modalError.visible}
        onClose={() => setModalError({ ...modalError, visible: false })}
        titulo={modalError.titulo}
        mensaje={modalError.mensaje}
        textoBoton={modalError.textoBoton}
      />

      {mostrarModalEditar && (
        <ModalEditar
          titulo="Editar Banco"
          datosIniciales={datosEdicion}
          campos={[
            { name: "nombre", label: "Nombre" },
            {
              name: "moneda",
              label: "Moneda",
              type: "select",
              options: [
                { value: "VES", label: "VES" },
                { value: "USD", label: "USD" },
              ],
            },
            {
              name: "tipo_identificador",
              label: "Tipo Identificador",
              type: "select",
              options: [
                { value: "nro_cuenta", label: "Número de cuenta" },
                { value: "email", label: "Email" },
              ],
            },
            { name: "identificador", label: "Identificador" },
            {
              name: "estado",
              label: "Estado",
              type: "select",
              options: [
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ],
            },
          ]}
          onSubmit={guardarEdicion}
          onCancel={() => setMostrarModalEditar(false)}
        />
      )}
    </div>
  );
}

export default BancosCRUD;
