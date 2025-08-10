import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/index";
import Loader from "../components/general/Loader";

export default function RutaPrivada({ children }) {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    api
      .get("/auth/verificar-sesion")
      .then((res) => {
        setAutenticado(true);
        setVerificando(false);
      })
      .catch((err) => {
        console.error("Error verificar-sesion:", err?.response || err);
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
