// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layouts/layout.jsx";
import LayoutConAside from "./components/Layouts/LayoutConAside.jsx";
import RutaPrivada from "./components/RutaPrivada.jsx";
import "./Styles/styles.css";
import {
  Dashboard,
  Login,
  Register,
  Administracion,
  ServiciosProductosPage,
  Operaciones,
  CotizacionesPage,
  RelacionesGatos,
  CrearRegistro,
  ProveedoresPage,
  ClientesPage,
  GastosPage,
  CXC,
  SolicitudesPage,
  UsuariosPage,
  SucursalesPage,
  BancosPage,
  ArchivosPage,
  VistaDetalleArchivo,
  GestorDeArchivos,
  Papelera,
  GestorDeEventos,
} from "./pages/pages.js";

// ——— Manejador global de errores para captura en iOS/WebKit ———
function mostrarErrorEnPantalla(detalle) {
  const contenedorError = document.createElement("pre");
  contenedorError.style.position = "fixed";
  contenedorError.style.top = "0";
  contenedorError.style.left = "0";
  contenedorError.style.width = "100%";
  contenedorError.style.maxHeight = "50vh";
  contenedorError.style.overflow = "auto";
  contenedorError.style.backgroundColor = "rgba(200,0,0,0.85)";
  contenedorError.style.color = "#ffffff";
  contenedorError.style.zIndex = "9999";
  contenedorError.style.padding = "10px";
  contenedorError.style.fontSize = "12px";
  contenedorError.textContent = detalle;
  document.body.appendChild(contenedorError);
}

// Capturar errores globales JS
window.onerror = function (
  mensajeError,
  fuente,
  numeroLinea,
  numeroColumna,
  objetoError
) {
  const textoError =
    `Error: ${mensajeError}\n` +
    `Fuente: ${fuente}\n` +
    `Línea: ${numeroLinea}, Columna: ${numeroColumna}\n` +
    (objetoError?.stack ? `Stack:\n${objetoError.stack}` : "");
  mostrarErrorEnPantalla(textoError);
  return false;
};

// Capturar promesas rechazadas no manejadas
window.addEventListener("unhandledrejection", (event) => {
  const razon = event.reason;
  const detalle =
    `Unhandled Rejection: ${razon?.message || razon}\n` +
    (razon?.stack ? `Stack:\n${razon.stack}` : "");
  mostrarErrorEnPantalla(detalle);
});

// Capturar errores de recursos (scripts, CSS, img)
window.addEventListener(
  "error",
  (event) => {
    if (event.target && (event.target.src || event.target.href)) {
      const recurso = event.target.src || event.target.href;
      const detalle = `Error cargando recurso: ${recurso}`;
      mostrarErrorEnPantalla(detalle);
    }
  },
  true
);

// Renderiza la aplicación
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Rutas privadas protegidas con layout */}
        <Route
          element={
            <RutaPrivada>
              <Layout />
            </RutaPrivada>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/administracion" element={<Administracion />} />
          <Route
            path="/administracion/servicios-productos"
            element={<ServiciosProductosPage />}
          />
          <Route path="/administracion/clientes" element={<ClientesPage />} />
          <Route
            path="/administracion/proveedores"
            element={<ProveedoresPage />}
          />
          <Route path="/administracion/usuarios" element={<UsuariosPage />} />
          <Route
            path="/administracion/sucursales"
            element={<SucursalesPage />}
          />
          <Route path="/administracion/bancos" element={<BancosPage />} />
          <Route path="/operaciones" element={<Operaciones />} />
          <Route
            path="/operaciones/cotizaciones"
            element={<CotizacionesPage />}
          />
          <Route path="/operaciones/cxc" element={<CXC />} />
          <Route path="/operaciones/gastos" element={<GastosPage />} />
          <Route
            path="/operaciones/solicitudes-pago"
            element={<SolicitudesPage />}
          />
          <Route path="/crearRegistro" element={<CrearRegistro />} />
          <Route element={<LayoutConAside />}>
            <Route path="/archivos" element={<ArchivosPage />} />
            <Route
              path="/gestor-archivos/archivo/:id"
              element={<VistaDetalleArchivo />}
            />
            <Route path="/gestor-eventos" element={<GestorDeEventos />} />
            <Route path="/papelera" element={<Papelera />} />
          </Route>
          <Route path="/gestor-archivos" element={<GestorDeArchivos />} />
          <Route path="/reportes" element={<RelacionesGatos />} />
        </Route>
        {/* Ruta no encontrada */}
        <Route path="*" element={<h1>Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
