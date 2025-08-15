// src/services/eventosArchivosApi.js
import axios from "axios";

const clienteEventosArchivos = axios.create({
  baseURL: "/api/eventos-archivos",
  withCredentials: true,
});

export const obtenerTendenciaActividad = async ({
  dias,
  registroTipo,
  accion,
  desde,
  hasta,
  todo, // "1" para histórico completo
} = {}) => {
  const parametros = {};
  if (dias) parametros.dias = dias;
  if (registroTipo) parametros.registroTipo = registroTipo;
  if (accion) parametros.accion = accion;
  if (desde) parametros.desde = desde; 
  if (hasta) parametros.hasta = hasta; 
  if (todo) parametros.todo = todo; 

  const { data } = await clienteEventosArchivos.get("/tendencia", {
    params: parametros,
  });
  return data; // { desde, hasta, dias, serie: [...] }
};
