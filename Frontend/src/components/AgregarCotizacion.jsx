import { useState, useEffect, useMemo } from "react";
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

  const [mobileView, setMobileView] = useState("informacion");
  const [avisoVisible, setAvisoVisible] = useState(false);

  const camposOperacion = [
    "operacion",
    "puerto",
    "bl",
    "mercancia",
    "contenedor",
  ];

  // Calcula si hay productos que obligan a mostrar campos de operación
  const necesitaCamposOperacion = useMemo(
    () => itemsAgregados.some((item) => item.tipo === "producto"),
    [itemsAgregados]
  );

  // Calcula si quedan campos de operación pendientes por llenar
  const camposPendientes = useMemo(
    () =>
      necesitaCamposOperacion &&
      camposOperacion.some((c) => datosGenerales[c] === ""),
    [necesitaCamposOperacion, datosGenerales]
  );

  // Muestra u oculta el aviso en función de los pendientes
  useEffect(() => {
    if (camposPendientes) {
      setAvisoVisible(true);
    } else {
      setAvisoVisible(false);
    }
  }, [camposPendientes]);

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

  // Navegación automática entre pestañas en móviles
  useEffect(() => {
    if (itemsAgregados.length > 0 && window.innerWidth < 1024) {
      if (camposPendientes) {
        setMobileView("informacion"); // Muestra los nuevos campos primero
      } else {
        setMobileView("productos");
      }
    }
  }, [itemsAgregados, camposPendientes]);

  return (
    <div className="mx-auto p-2 sm:p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 text-white">
        Crear Cotización
      </h2>

      {/* Barra de navegación móvil */}
      <div className="lg:hidden flex mb-3 bg-gray-800 rounded-md p-1 relative">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md ${
            mobileView === "informacion"
              ? "bg-gray-700 text-white shadow"
              : "text-gray-300"
          }`}
          onClick={() => setMobileView("informacion")}
        >
          Información
          {camposPendientes && (
            <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md ${
            mobileView === "productos"
              ? "bg-gray-700 text-white shadow"
              : "text-gray-300"
          }`}
          onClick={() => setMobileView("productos")}
        >
          Productos ({itemsAgregados.length})
        </button>
      </div>

      {/* Banner de aviso */}
      {avisoVisible && (
        <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg text-yellow-300 flex justify-between items-start">
          <div className="text-sm">
            <p className="font-semibold">¡Atención!</p>
            <p>
              Se habilitaron nuevos campos de operación. Complétalos antes de
              generar la cotización.
            </p>
          </div>
          <button
            onClick={() => setAvisoVisible(false)}
            className="ml-4 text-yellow-300 hover:text-yellow-100"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        {/* Columna izquierda - Información */}
        <div
          className={`${
            mobileView === "informacion" ? "block" : "hidden"
          } lg:block space-y-3`}
        >
          <div className="bg-gray-800 p-3 rounded-lg">
            <ClienteSelector
              clientes={clientes}
              setClientes={setClientes}
              onClienteSeleccionado={setClienteSeleccionado}
              mostrarError={mostrarClienteInvalido}
              añadirCliente={añadirCliente}
              compactMode={true}
            />
          </div>

          <div className="bg-gray-800 p-3 rounded-lg">
            <DatosGeneralesCotizacion
              datos={datosGenerales}
              onChange={setDatosGenerales}
              mostrarCamposOperacion={necesitaCamposOperacion}
              compactMode={true}
            />
          </div>
        </div>

        {/* Columna derecha - Productos y resumen */}
        <div
          className={`${
            mobileView === "productos" ? "block" : "hidden"
          } lg:block space-y-3`}
        >
          <div className="bg-gray-800 p-3 rounded-lg">
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
          </div>

          <div className="bg-gray-800 p-3 rounded-lg">
            <ItemsSeleccionados
              items={itemsAgregados}
              onUpdate={setItemsAgregados}
              onRemove={(id) =>
                setItemsAgregados((prev) =>
                  prev.filter((item) => item.id !== id)
                )
              }
              compactMode={true}
            />
          </div>

          <div className="bg-gray-800 p-3 rounded-lg sticky bottom-0">
            <ResumenCotizacion
              items={itemsAgregados}
              onGenerar={handleGenerarCotizacion}
              subtotal={subtotal}
              compactMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgregarCotizacion;
