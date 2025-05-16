import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function RutaPrivada({ children }) {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/auth/verificar-sesion", {
        withCredentials: true, // 👈 MUY IMPORTANTE
      })
      .then((res) => {
        setAutenticado(true);
        setVerificando(false);
      })
      .catch(() => {
        setAutenticado(false);
        setVerificando(false);
      });
  }, []);

  if (verificando) return <p className="text-white">Verificando sesión...</p>;

  if (!autenticado) return <Navigate to="/login" />;

  return children;
}
