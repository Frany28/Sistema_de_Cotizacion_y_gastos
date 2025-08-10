import axios from "axios";

export const clienteHttp = axios.create({
  baseURL: "/api",
  withCredentials: true, // ¡obligatorio para enviar cookies!
  timeout: 20000,
});
