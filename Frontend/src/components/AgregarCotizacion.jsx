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
    <div className="mx-auto p-2 sm:p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 text-white">
        Crear Cotización
      </h2>

      {/* Diseño de una sola columna para móviles */}
      <div className="space-y-4">
        {/* Sección de Información siempre visible */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-white font-medium mb-2">Información General</h3>
          <ClienteSelector
            clientes={clientes}
            setClientes={setClientes}
            onClienteSeleccionado={setClienteSeleccionado}
            mostrarError={mostrarClienteInvalido}
            añadirCliente={añadirCliente}
            compactMode={true}
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

        {/* Sección de Productos/Servicios */}
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-white font-medium mb-2">Productos/Servicios</h3>
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
        </div>

        {/* Resumen fijo en la parte inferior */}
        <div className="bg-gray-800 p-3 rounded-lg sticky bottom-2">
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
