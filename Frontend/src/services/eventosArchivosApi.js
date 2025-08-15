// src/services/eventosArchivosApi.js
import axios from "axios";

const clienteEventosArchivos = axios.create({
  baseURL: "/api/eventos-archivos", // ← igual al de app.js
  withCredentials: true,
});

export const obtenerTendenciaActividad = async (parametros = {}) => {
  const { data } = await clienteEventosArchivos.get("/tendencia", {
    params: parametros,
  });
  return data;
};
