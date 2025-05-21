// main.jsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout.jsx";
import RutaPrivada from "./components/RutaPrivada.jsx"; // Asegúrate que esté aquí
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
} from "./pages/pages.js";

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
          <Route path="/reportes" element={<RelacionesGatos />} />
        </Route>

        {/* Ruta no encontrada */}
        <Route path="*" element={<h1>Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
