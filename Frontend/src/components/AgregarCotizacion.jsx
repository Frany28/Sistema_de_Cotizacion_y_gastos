import { useState, useEffect } from "react";
import ClienteSelector from "../components/ComponentesCotizacion/ClienteSelector.jsx";
import ResumenCotizacion from "./ComponentesCotizacion/ResumenCotizacion.jsx";
import ServProCotizacion from "./ComponentesCotizacion/ServProCotizacion.jsx";
import ItemsSeleccionados from "./ComponentesCotizacion/ItemsSeleccionados.jsx";
import DatosGeneralesCotizacion from "./ComponentesCotizacion/DatosGenerales.jsx";

const AgregarCotizacion = ({
  clientes,
  setClienteSeleccionado,
  mostrarClienteInvalido,
  setClientes,
  servicios,
  onGenerarCotizacion,
  onActualizarDatos, // ✅ Nueva prop para actualizar datosGenerales en tiempo real
  itemsAgregados,
  setItemsAgregados,
}) => {
  const [datosGenerales, setDatosGenerales] = useState({
    fecha: "",
    observaciones: "",
    operacion: "",
    puerto: "",
    bl: "",
    mercancia: "",
    contenedor: "",
  });

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
    <>
      <div className="mx-auto p-6 rounded-lg bg-gray-900">
        <h2 className="text-xl font-semibold mb-6 text-white">
          Crear Solicitud de Cotización
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-6">
          <div className="flex flex-col gap-6 w-full mb-6">
            <ClienteSelector
              clientes={clientes}
              setClientes={setClientes}
              onClienteSeleccionado={setClienteSeleccionado}
              mostrarError={mostrarClienteInvalido}
            />
            <div className="w-full">
              <DatosGeneralesCotizacion
                datos={datosGenerales}
                onChange={setDatosGenerales}
                mostrarCamposOperacion={itemsAgregados.some(
                  (item) => item.tipo === "producto"
                )}
              />
            </div>
          </div>

          <div>
            <div className="flex flex-col gap-6 w-full mb-6">
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
                  setItemsAgregados((prev) =>
                    prev.filter((item) => item.id !== id)
                  )
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
      </div>
    </>
  );
};

export default AgregarCotizacion;
