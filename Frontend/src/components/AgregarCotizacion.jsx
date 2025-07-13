import { useState, useEffect, useMemo } from "react";
import ClienteSelector from "../components/ComponentesCotizacion/ClienteSelector.jsx";
import ResumenCotizacion from "./ComponentesCotizacion/ResumenCotizacion.jsx";
import ServProCotizacion from "./ComponentesCotizacion/ServProCotizacion.jsx";
import ItemsSeleccionados from "./ComponentesCotizacion/ItemsSeleccionados.jsx";
import DatosGeneralesCotizacion from "./ComponentesCotizacion/DatosGenerales.jsx";

// Fecha de hoy en formato yyyy-mm-dd
const today = new Date().toISOString().split("T")[0];

/**
 * Componente principal para crear una cotización.
 * Mantiene la UX original en pantallas ≥ lg, pero en móviles muestra
 * pestañas mejoradas con indicadores de campos pendientes.
 */
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
  /* ---------------------------- Estados internos --------------------------- */
  const [datosGenerales, setDatosGenerales] = useState({
    fecha: today,
    observaciones: "",
    operacion: "",
    puerto: "",
    bl: "",
    mercancia: "",
    contenedor: "",
  });

  // Vista móvil actual: "informacion" | "productos"
  const [mobileView, setMobileView] = useState("informacion");

  /* ----------------------------- Memo helpers ----------------------------- */
  /**
   * true cuando se haya agregado al menos un ítem de tipo "producto".
   * Esto indica que aparecen campos adicionales en la sección Información.
   */
  const necesitaCamposOperacion = useMemo(
    () => itemsAgregados.some((item) => item.tipo === "producto"),
    [itemsAgregados]
  );

  /**
   * Evalúa si los campos de operación ya fueron completados.
   * Se utilizará para mostrar badge de alerta al usuario.
   */
  const camposOperacionCompletos = useMemo(() => {
    if (!necesitaCamposOperacion) return true; // No se requieren.
    const { operacion, puerto, bl, mercancia, contenedor } = datosGenerales;
    return (
      operacion.trim() &&
      puerto.trim() &&
      bl.trim() &&
      mercancia.trim() &&
      contenedor.trim()
    );
  }, [datosGenerales, necesitaCamposOperacion]);

  /* -------------------------- Funciones auxiliares ------------------------ */
  const añadirCliente = (clienteCreado) => {
    setClientes((prev) => [...prev, clienteCreado]);
    setClienteSeleccionado(clienteCreado);
  };

  const subtotal = itemsAgregados.reduce(
    (sum, item) => sum + (item.precio || 0) * (item.cantidad || 0),
    0
  );

  const handleGenerarCotizacion = () => {
    onGenerarCotizacion(datosGenerales);
  };

  /* ------------------------------- Efectos -------------------------------- */
  // Reporta cualquier cambio en datosGenerales al padre
  useEffect(() => {
    if (onActualizarDatos) {
      onActualizarDatos(datosGenerales);
    }
  }, [datosGenerales, onActualizarDatos]);

  /**
   * UX móvil mejorada:
   * - Si se requiere llenar campos de operación, redirige automáticamente a "informacion".
   * - De lo contrario, después de agregar el primer ítem, muestra la pestaña "productos".
   * - Solo aplica en pantallas menores a lg para no afectar la vista desktop.
   */
  useEffect(() => {
    if (window.innerWidth >= 1024) return; // Solo móvil/tablet

    if (necesitaCamposOperacion && !camposOperacionCompletos) {
      setMobileView("informacion");
    } else if (itemsAgregados.length > 0) {
      setMobileView("productos");
    }
  }, [necesitaCamposOperacion, camposOperacionCompletos, itemsAgregados]);

  /* ------------------------------- Render --------------------------------- */
  return (
    <div className="mx-auto p-2 sm:p-4 bg-gray-900 rounded-lg">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 text-white">
        Crear Cotización
      </h2>

      {/* Barra de navegación móvil mejorada */}
      <div className="lg:hidden flex mb-3 bg-gray-800 rounded-md p-1 relative overflow-hidden">
        {/* Botón Información */}
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
            mobileView === "informacion"
              ? "bg-gray-700 text-white shadow"
              : "text-gray-300"
          }`}
          onClick={() => setMobileView("informacion")}
        >
          Información
          {/* Badge rojo si faltan campos */}
          {!camposOperacionCompletos && (
            <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Botón Productos */}
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
            mobileView === "productos"
              ? "bg-gray-700 text-white shadow"
              : "text-gray-300"
          }`}
          onClick={() => setMobileView("productos")}
        >
          Productos ({itemsAgregados.length})
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        {/* --------------------- Columna Izquierda (Información) --------------------- */}
        <div
          className={`${
            mobileView === "informacion" ? "block" : "hidden"
          } lg:block space-y-3`}
        >
          {/* Selector de Cliente */}
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

          {/* Datos Generales */}
          <div className="bg-gray-800 p-3 rounded-lg">
            <DatosGeneralesCotizacion
              datos={datosGenerales}
              onChange={setDatosGenerales}
              mostrarCamposOperacion={necesitaCamposOperacion}
              compactMode={true}
            />
          </div>
        </div>

        {/* --------------------- Columna Derecha (Productos + Resumen) --------------------- */}
        <div
          className={`${
            mobileView === "productos" ? "block" : "hidden"
          } lg:block space-y-3`}
        >
          {/* Lista de Servicios / Productos */}
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

          {/* Ítems seleccionados */}
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

          {/* Resumen y botón Generar cotización */}
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
