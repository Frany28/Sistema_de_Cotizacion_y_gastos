import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/index";
import Loader from "../components/general/Loader";

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
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
