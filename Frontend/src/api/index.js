import axios from "axios";

export const clienteHttp = axios.create({
  baseURL: "/api",
  withCredentials: true, 
  timeout: 20000,
});
