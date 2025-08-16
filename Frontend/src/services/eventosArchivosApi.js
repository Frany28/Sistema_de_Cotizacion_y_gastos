// src/services/eventosArchivosApi.js
import axios from "axios";

const clienteEventosArchivos = axios.create({
  baseURL: "/api/archivos/eventos", // ← igual al de app.js
  withCredentials: true,
  timeout: 20000,
});

/* === Feed principal (lista de eventos) ===
   OJO: en tu backend el feed está en "/"
   Parámetros soportados (opcionales):
   - limit, offset, q, accion, registroTipo, desde, hasta
*/
export const obtenerActividadReciente = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/", {
    params: parametros,
  });
  return data;
};

/* === Contadores para chips (Agregado/Eliminado/Reemplazado...) === */
export const obtenerContadoresTarjetas = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/contadores", {
    params: parametros,
  });
  return data;
};

/* === Métricas globales del tablero === */
export const obtenerMetricasTablero = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/metricas", {
    params: parametros,
  });
  return data;
};

/* === Tendencia diaria (para el gráfico) === */
export const obtenerTendenciaActividad = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/tendencia", {
    params: parametros,
  });
  return data;
};

/* === Por archivo: versiones del mes === */
export const contarVersionesDelMesPorArchivo = async (archivoId) => {
  const { data } = await clienteEventosArchivos.get(
    `/${archivoId}/versiones-del-mes`
  );
  return data;
};

/* === Por documento: almacenamiento total === */
export const obtenerAlmacenamientoTotalPorDocumento = async (archivoId) => {
  const { data } = await clienteEventosArchivos.get(
    `/${archivoId}/almacenamiento-total`
  );
  return data;
};
