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

  // 🔹 Formateo numérico LATAM (1.234,56)
  const formatearMontoLatam = (monto) => {
    const numero = Number(monto);

    if (Number.isNaN(numero)) {
      return "0,00";
    }

    return numero.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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
    <div className="mb-6 bg-gray-800 rounded-xl shadow-md border border-gray-700 overflow-hidden">
      {/* Desktop/Tablet View */}
      <div className="hidden md:block">
        <table className="w-full text-sm text-left text-gray-400">
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
                    ${formatearMontoLatam(cuenta.monto)}
                  </td>
                  <td className="px-4 py-3 text-white">
                    ${formatearMontoLatam(cuenta.saldo_restante)}
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
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {loading ? (
          <div className="text-center py-6 text-white">
            Cargando cuentas por cobrar...
          </div>
        ) : !clienteId ? (
          <div className="text-center py-6 text-white">
            Por favor, seleccione un cliente para ver las cuentas por cobrar.
          </div>
        ) : cuentas.length === 0 ? (
          <div className="text-center py-6 text-white">
            No hay cuentas por cobrar para este cliente.
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Código</p>
                    <p className="text-white font-medium">{cuenta.codigo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Estado</p>
                    <p className="text-white capitalize">{cuenta.estado}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Monto</p>
                    <p className="text-white">
                      ${formatearMontoLatam(cuenta.monto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Saldo</p>
                    <p className="text-white">
                      ${formatearMontoLatam(cuenta.saldo_restante)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Emisión</p>
                    <p className="text-white">
                      {new Date(cuenta.fecha_emision).toLocaleDateString(
                        "es-VE"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Vencimiento</p>
                    <p className="text-white">
                      {new Date(cuenta.fecha_vencimiento).toLocaleDateString(
                        "es-VE"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
