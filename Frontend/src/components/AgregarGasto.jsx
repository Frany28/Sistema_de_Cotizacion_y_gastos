import React, { useState, useEffect } from "react";
import TipoGastoSelector from "../components/ComponentesGasto/TipoGastoSelector";
import DatosGeneralesGasto from "../components/ComponentesGasto/DatosGeneralesGasto";
import DatosMonetariosGasto from "../components/ComponentesGasto/DatosMonetarios";
import ProveedorSelector from "../components/ComponentesGasto/ProveedorSelector";
import CotizacionSelector from "../components/ComponentesGasto/CotizacionSelector";
import ResumenGasto from "../components/ComponentesGasto/ResumenGasto";

export default function AgregarGasto({
  sucursales = [],
  proveedores = [],
  setProveedores,
  cotizaciones = [],
  crearGasto,
}) {
  // Estado inicial con todos los campos que usaremos
  const [gasto, setGasto] = useState({
    tipo_gasto_id: "",
    proveedor_id: null,
    cotizacion_id: null,
    concepto_pago: "",
    fecha: new Date().toISOString().split("T")[0],
    sucursal_id: "",
    descripcion: "",
    subtotal: "",
    porcentaje_iva: 0,
    tasa_cambio: "",
    moneda: "USD",
    documento: null,
  });

  const [tipoGastoSeleccionado, setTipoGastoSeleccionado] = useState(null);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState(null);
  const [mobileView, setMobileView] = useState("informacion");

  // Cuando el usuario elige una cotización, guardamos su id en gasto
  useEffect(() => {
    if (cotizacionSeleccionada) {
      setGasto((prev) => ({
        ...prev,
        cotizacion_id: cotizacionSeleccionada.id,
      }));
    }
  }, [cotizacionSeleccionada]);

  const nombreTipo = tipoGastoSeleccionado?.nombre?.toLowerCase() || "";
  const esProveedor =
    nombreTipo.includes("proveedor") ||
    nombreTipo.includes("servicio prestado");
  const esRentable = tipoGastoSeleccionado?.rentable === 1;

  const handleRegistrar = () => {
    crearGasto(gasto);
  };

  return (
    <div className="mx-auto p-2 sm:p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 text-white">
        Crear Solicitud de Gasto
      </h2>

      {/* Barra de navegación móvil */}
      <div className="lg:hidden flex mb-3 bg-gray-800 rounded-md p-1">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md ${
            mobileView === "informacion"
              ? "bg-gray-700 text-white shadow"
              : "text-gray-300"
          }`}
          onClick={() => setMobileView("informacion")}
        >
          Información
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md ${
            mobileView === "monetario"
              ? "bg-gray-700 text-white shadow"
              : "text-gray-300"
          }`}
          onClick={() => setMobileView("monetario")}
        >
          Datos Monetarios
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-4">
        {/* Columna izquierda - Información básica */}
        <div
          className={`${
            mobileView === "informacion" ? "block" : "hidden"
          } lg:block lg:col-span-2 space-y-3`}
        >
          <div className="bg-gray-800 p-3 rounded-lg">
            <TipoGastoSelector
              tipoGastoSeleccionado={tipoGastoSeleccionado}
              onSeleccionar={(tipo) => {
                setTipoGastoSeleccionado(tipo);
                setGasto((prev) => ({
                  ...prev,
                  tipo_gasto_id: tipo.id,
                }));
              }}
              compactMode={true}
            />
          </div>

          {esProveedor && (
            <div className="bg-gray-800 p-3 rounded-lg">
              <ProveedorSelector
                proveedores={proveedores}
                setProveedores={setProveedores}
                proveedorSeleccionado={
                  proveedores.find((p) => p.id === gasto.proveedor_id) || null
                }
                onSeleccionar={(prov) =>
                  setGasto((prev) => ({
                    ...prev,
                    proveedor_id: prov.id,
                  }))
                }
                compactMode={true}
              />
            </div>
          )}

          {esRentable && (
            <div className="bg-gray-800 p-3 rounded-lg">
              <CotizacionSelector
                cotizaciones={cotizaciones}
                cotizacionSeleccionada={cotizacionSeleccionada}
                onSeleccionar={setCotizacionSeleccionada}
                compactMode={true}
              />
            </div>
          )}

          <div className="bg-gray-800 p-3 rounded-lg">
            <DatosGeneralesGasto
              gasto={gasto}
              setGasto={setGasto}
              sucursales={sucursales}
              compactMode={true}
            />
          </div>
        </div>

        {/* Columna derecha - Datos monetarios y resumen */}
        <div
          className={`${
            mobileView === "monetario" ? "block" : "hidden"
          } lg:block lg:col-span-1 space-y-3`}
        >
          <div className="bg-gray-800 p-3 rounded-lg">
            <DatosMonetariosGasto
              gasto={gasto}
              setGasto={setGasto}
              compactMode={true}
            />
          </div>

          <div className="bg-gray-800 p-3 rounded-lg sticky top-4">
            <ResumenGasto
              gasto={gasto}
              onRegistrar={handleRegistrar}
              compactMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
