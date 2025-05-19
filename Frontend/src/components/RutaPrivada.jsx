import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/index";

export default function RutaPrivada({ children }) {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    // Llamamos al backend usando la instancia preconfigurada
    api
      .get("/auth/verificar-sesion") // baseURL + /auth/verificar-sesion
      .then(() => {
        setAutenticado(true);
        setVerificando(false);
      })
      .catch(() => {
        setAutenticado(false);
        setVerificando(false);
      });
  }, []);

  if (verificando) {
    return <p className="text-white">Verificando sesión…</p>;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
