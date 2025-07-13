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

  const [activeTab, setActiveTab] = useState("informacion"); // 'informacion' o 'productos'

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
    <div className="mx-auto p-4 sm:p-6 rounded-lg bg-gray-900">
      <h2 className="text-xl font-semibold mb-4 sm:mb-6 text-white">
        Crear Solicitud de Cotización
      </h2>

      {/* Pestañas para móvil */}
      <div className="lg:hidden flex border-b border-gray-700 mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "informacion"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("informacion")}
        >
          Información
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "productos"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("productos")}
        >
          Productos/Servicios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Columna izquierda - Información del cliente */}
        <div
          className={`${
            activeTab === "informacion" ? "block" : "hidden"
          } lg:block flex flex-col gap-6 w-full`}
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
          />
        </div>

        {/* Columna derecha - Productos y resumen */}
        <div
          className={`${
            activeTab === "productos" ? "block" : "hidden"
          } lg:block flex flex-col gap-6 w-full`}
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
          />

          <ItemsSeleccionados
            items={itemsAgregados}
            onUpdate={setItemsAgregados}
            onRemove={(id) =>
              setItemsAgregados((prev) => prev.filter((item) => item.id !== id))
            }
          />

          <ResumenCotizacion
            items={itemsAgregados}
            onGenerar={handleGenerarCotizacion}
            subtotal={subtotal}
          />
        </div>
      </div>
    </div>
  );
};

export default AgregarCotizacion;
