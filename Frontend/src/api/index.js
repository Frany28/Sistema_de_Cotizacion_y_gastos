// src/api/index.js
import axios from "axios";
console.log("VITE_API_URL →", import.meta.env.VITE_API_URL);
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,

  withCredentials: true, // para que viaje la cookie de sesión
});

export default api;
