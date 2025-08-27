// src/services/eventosArchivosApi.js
import axios from "axios";

const clienteEventosArchivos = axios.create({
  baseURL: "/api/archivos/eventos", // coincide con el backend
  withCredentials: true,
});

/* ───────── Tendencia (gráfico) ───────── */
export const obtenerTendenciaActividad = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/tendencia", {
    params: parametros,
  });
  return data;
};

/* ───────── Métricas del tablero ───────── */
export const obtenerMetricasTablero = async () => {
  const { data } = await clienteEventosArchivos.get("/metricas");
  return data;
};

/* ───────── Contadores (tarjetas) ─────────
   params opcionales: { desde, hasta, registroTipo }
*/
export const obtenerContadoresTarjetas = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/contadores", {
    params: parametros,
  });
  return data;
};

/* ───────── Reporte PDF ─────────
   Acepta:
   - tipoReporte: "mensual" | "anual" | "rango"
   - mes, anio (para mensual)
   - anio (para anual)
   - fechaInicio, fechaFin (para rango)
   - registroTipo (opcional: firmas, facturasGastos, ...)
*/
export const descargarReporteEventosPdf = async (parametros) => {
  const resp = await clienteEventosArchivos.get("/reporte.pdf", {
    params: parametros,
    responseType: "blob",
  });
  return resp.data; // Blob
};
