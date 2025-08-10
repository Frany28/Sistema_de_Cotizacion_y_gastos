// Frontend/src/api/index.js
import axios from "axios";

export const clienteHttp = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 20000,
});

// helpers opcionales con nombre
export const get = (ruta, opciones) => clienteHttp.get(ruta, opciones);
export const post = (ruta, data, opciones) =>
  clienteHttp.post(ruta, data, opciones);
export const put = (ruta, data, opciones) =>
  clienteHttp.put(ruta, data, opciones);
export const patch = (ruta, data, opciones) =>
  clienteHttp.patch(ruta, data, opciones);
export const del = (ruta, opciones) => clienteHttp.delete(ruta, opciones);

// 👇 Exportación por defecto (soluciona el error del build)
export default clienteHttp;
