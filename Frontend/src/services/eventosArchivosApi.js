// src/services/eventosArchivosApi.js
import axios from "axios";

/**
 * Base del API:
 * - Si defines VITE_API_URL (https://tu-backend.com), la usamos.
 * - Si no, queda relativo al mismo origen: /api/eventos-archivos
 */
const API_ORIGIN =
  (import.meta.env?.VITE_API_URL?.replace(/\/$/, "") || "") +
  "/api/eventos-archivos";

const clienteEventosArchivos = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

/* ============== Helpers ============== */
const get = async (url, params, config = {}) => {
  const resp = await clienteEventosArchivos.get(url, { params, ...config });
  return resp.data;
};

/* ============== Endpoints ============== */

/** Métricas del tablero */
export const obtenerMetricasTablero = () => get("/metricas");

/** Tendencia (gráfico de líneas/barras), acepta { dias, registroTipo, accion } */
export const obtenerTendenciaActividad = (parametros = {}) =>
  get("/tendencia", parametros);

/** Contadores (tarjetas) acepta { desde, hasta, registroTipo } */
export const obtenerContadoresTarjetas = (parametros = {}) =>
  get("/contadores", parametros);

/** Feed de actividad (paginado) acepta { limit, offset, q, accion, registroTipo, desde, hasta } */
export const listarActividadReciente = (parametros = {}) =>
  get("/", parametros);

/** Versiones del mes para un archivo */
export const contarVersionesDelMesPorArchivo = (archivoId) =>
  get(`/${archivoId}/versiones-del-mes`);

/** Almacenamiento total por documento (todos los archivos del mismo registroTipo/registroId) */
export const obtenerAlmacenamientoTotalPorDocumento = (archivoId) =>
  get(`/${archivoId}/almacenamiento-total`);

/**
 * Generar y descargar PDF de movimientos
 * Acepta:
 *  - tipoReporte: "mensual" | "anual" | "rango"
 *  - mes, anio (mensual)
 *  - anio (anual)
 *  - fechaInicio, fechaFin (rango, formato YYYY-MM-DD)
 *  - registroTipo (opcional)
 */
export const descargarReporteEventosPdf = async (parametros = {}) => {
  const resp = await clienteEventosArchivos.get("/reporte/pdf", {
    params: parametros,
    responseType: "blob",
  });
  return resp.data; // Blob del PDF
};

export default {
  obtenerMetricasTablero,
  obtenerTendenciaActividad,
  obtenerContadoresTarjetas,
  listarActividadReciente,
  contarVersionesDelMesPorArchivo,
  obtenerAlmacenamientoTotalPorDocumento,
  descargarReporteEventosPdf,
};
