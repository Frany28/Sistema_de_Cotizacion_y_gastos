import { useState, useEffect } from "react";
import ClienteSelector from "../components/ComponentesCotizacion/ClienteSelector.jsx";
import ResumenCotizacion from "./ComponentesCotizacion/ResumenCotizacion.jsx";
import ServProCotizacion from "./ComponentesCotizacion/ServProCotizacion.jsx";
import ItemsSeleccionados from "./ComponentesCotizacion/ItemsSeleccionados.jsx";
import DatosGeneralesCotizacion from "./ComponentesCotizacion/DatosGenerales.jsx";

const today = new Date().toISOString().split("T")[0];
const AgregarCotizacion = ({
  clientes,
  setClienteSeleccionado,
  mostrarClienteInvalido,
  setClientes,
  servicios,
  onGenerarCotizacion,
  onActualizarDatos,
  itemsAgregados,
  setItemsAgregados,
}) => {
  const [datosGenerales, setDatosGenerales] = useState({
    fecha: today,
    observaciones: "",
    operacion: "",
    puerto: "",
    bl: "",
    mercancia: "",
    contenedor: "",
  });

  const [activeTab, setActiveTab] = useState("informacion");

  const añadirCliente = (clienteCreado) => {
    setClientes((prev) => [...prev, clienteCreado]);
    setClienteSeleccionado(clienteCreado);
  };

  useEffect(() => {
    if (onActualizarDatos) {
      onActualizarDatos(datosGenerales);
    }
  }, [datosGenerales, onActualizarDatos]);

  const subtotal = itemsAgregados.reduce(
    (sum, item) => sum + (item.precio || 0) * (item.cantidad || 0),
    0
  );

  const handleGenerarCotizacion = () => {
    onGenerarCotizacion(datosGenerales);
  };

  return (
    <div className="mx-auto p-2 sm:p-4 md:p-6 rounded-lg bg-gray-900">
      <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 text-white">
        Crear Solicitud de Cotización
      </h2>

      {/* Pestañas para móvil - más compactas */}
      <div className="lg:hidden flex border-b border-gray-700 mb-2">
        <button
          className={`px-3 py-1 text-sm sm:text-base font-medium ${
            activeTab === "informacion"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("informacion")}
        >
          Información
        </button>
        <button
          className={`px-3 py-1 text-sm sm:text-base font-medium ${
            activeTab === "productos"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("productos")}
        >
          Productos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 w-full">
        {/* Columna izquierda - más compacta */}
        <div
          className={`${
            activeTab === "informacion" ? "block" : "hidden"
          } lg:block flex flex-col gap-3 sm:gap-4 w-full`}
        >
          <ClienteSelector
            clientes={clientes}
            setClientes={setClientes}
            onClienteSeleccionado={setClienteSeleccionado}
            mostrarError={mostrarClienteInvalido}
            añadirCliente={añadirCliente}
          />

          <DatosGeneralesCotizacion
            datos={datosGenerales}
            onChange={setDatosGenerales}
            mostrarCamposOperacion={itemsAgregados.some(
              (item) => item.tipo === "producto"
            )}
            compactMode={true}
          />
        </div>

        {/* Columna derecha - más compacta */}
        <div
          className={`${
            activeTab === "productos" ? "block" : "hidden"
          } lg:block flex flex-col gap-3 sm:gap-4 w-full`}
        >
          <ServProCotizacion
            servicios={servicios}
            itemsSeleccionados={itemsAgregados}
            onAgregar={(servicio) => {
              const nuevoItem = {
                id: servicio.id,
                nombre: servicio.nombre,
                precio: parseFloat(servicio.precio),
                cantidad: 1,
                porcentaje_iva: parseFloat(servicio.porcentaje_iva) || 0,
                tipo: servicio.tipo,
              };
              setItemsAgregados((prevItems) => [...prevItems, nuevoItem]);
            }}
            compactMode={true}
          />

          <ItemsSeleccionados
            items={itemsAgregados}
            onUpdate={setItemsAgregados}
            onRemove={(id) =>
              setItemsAgregados((prev) => prev.filter((item) => item.id !== id))
            }
            compactMode={true}
          />

          <ResumenCotizacion
            items={itemsAgregados}
            onGenerar={handleGenerarCotizacion}
            subtotal={subtotal}
            compactMode={true}
          />
        </div>
      </div>
    </div>
  );
};

export default AgregarCotizacion;
