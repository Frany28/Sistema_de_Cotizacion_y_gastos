// src/components/ComponentesCXC/TablaCuentasPorCobrar.jsx

import React, { useEffect, useState } from "react";
import api from "../../api/index";
import BotonIcono from "../general/BotonIcono";
import ModalRegistrarAbono from "../Modals/ModalRegistrarAbono";
import ModalError from "../Modals/ModalError";

const TablaCuentasPorCobrar = ({ clienteId, onRefreshTotals }) => {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [mostrarModalAbono, setMostrarModalAbono] = useState(false);
  const [mostrarModalError, setMostrarModalError] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  const fetchCuentas = async () => {
    if (!clienteId) {
      setCuentas([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/cuentas?cliente_id=${clienteId}`);
      setCuentas(response.data.cuentas);
    } catch (error) {
      console.error("Error al obtener cuentas por cobrar:", error);
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, [clienteId]);

  return (
    <div className="mb-6 bg-gray-800 rounded-xl shadow-md border border-gray-700">
      <table className="w-full text-sm text-left text-gray-400  ">
        <thead className="text-xs bg-gray-700 text-gray-400">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Monto</th>
            <th className="px-4 py-3">Saldo Restante</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Fecha Emisión</th>
            <th className="px-4 py-3">Fecha Vencimiento</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="text-center py-6 text-white">
                Cargando cuentas por cobrar...
              </td>
            </tr>
          ) : !clienteId ? (
            <tr>
              <td colSpan="7" className="text-center py-6 text-white">
                Por favor, seleccione un cliente para ver las cuentas por
                cobrar.
              </td>
            </tr>
          ) : cuentas.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-6 text-white">
                No hay cuentas por cobrar para este cliente.
              </td>
            </tr>
          ) : (
            cuentas.map((cuenta) => (
              <tr key={cuenta.id} className="border-b border-gray-700">
                <td className="px-4 py-3 font-medium text-white">
                  {cuenta.codigo}
                </td>
                <td className="px-4 py-3 text-white">
                  ${parseFloat(cuenta.monto).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-white">
                  ${parseFloat(cuenta.saldo_restante).toFixed(2)}
                </td>
                <td className="px-4 py-3 capitalize text-white">
                  {cuenta.estado}
                </td>
                <td className="px-4 py-3 text-white">
                  {new Date(cuenta.fecha_emision).toLocaleDateString("es-VE")}
                </td>
                <td className="px-4 py-3 text-white">
                  {new Date(cuenta.fecha_vencimiento).toLocaleDateString(
                    "es-VE"
                  )}
                </td>
                <td className="px-4 py-3">
                  <BotonIcono
                    tipo="abonar"
                    titulo="Registrar Abono"
                    onClick={() => {
                      const estado = (cuenta.estado || "").toLowerCase();
                      const pagada =
                        ["pagado", "pagada"].includes(estado) ||
                        Number(cuenta.saldo_restante) === 0;

                      if (pagada) {
                        setMensajeError(
                          "Esta cuenta por cobrar ya está pagada."
                        );
                        setMostrarModalError(true);
                      } else {
                        setCuentaSeleccionada(cuenta);
                        setMostrarModalAbono(true);
                      }
                    }}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {mostrarModalAbono && cuentaSeleccionada && (
        <ModalRegistrarAbono
          cuentaId={cuentaSeleccionada.id}
          usuarioId={1} // ajusta según tu contexto
          onCancel={() => setMostrarModalAbono(false)}
          onRefreshTotals={() => {
            fetchCuentas(); // refresca la tabla
            onRefreshTotals(); // refresca componentes TotalesCXC
            setMostrarModalAbono(false); // cierra el modal
          }}
        />
      )}

      {mostrarModalError && (
        <ModalError
          visible={mostrarModalError}
          titulo="Operación no permitida"
          mensaje={mensajeError}
          onClose={() => setMostrarModalError(false)}
        />
      )}
    </div>
  );
};

export default TablaCuentasPorCobrar;
