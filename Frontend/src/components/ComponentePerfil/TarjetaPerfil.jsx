// src/components/ComponentePerfil/TarjetaPerfil.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import api from "../../api/index.js";

function TarjetaPerfil({ rutaApi = "/perfil/tarjeta" }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Obtener tarjeta de usuario (datos reales)
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await api.get(rutaApi, { withCredentials: true });
        if (cancelado) return;
        setUsuario(res?.data?.usuario || null);
      } catch (e) {
        if (cancelado) return;
        console.error("Error al cargar tarjeta de perfil:", e);
        setError("No se pudo cargar la información del usuario.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [rutaApi]);

  // Iniciales: primeras letras de las dos primeras palabras
  const obtenerIniciales = (nombre = "") => {
    const partes = nombre.trim().split(/\s+/);
    const p1 = partes[0]?.charAt(0).toUpperCase() || "";
    const p2 = partes[1]?.charAt(0).toUpperCase() || "";
    return p1 + p2 || "US";
  };

  const cerrarSesion = () => {
    // misma lógica que el Navbar
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="w-[360px] sm:w-[420px] bg-[#1f2937] rounded-2xl p-6 shadow-lg border border-white/10">
      {cargando ? (
        <div className="animate-pulse">
          <div className="mx-auto h-20 w-20 rounded-full bg-slate-600" />
          <div className="mt-4 h-5 bg-slate-600 rounded w-40 mx-auto" />
          <div className="mt-2 h-4 bg-slate-700 rounded w-56 mx-auto" />
          <div className="mt-4 h-6 bg-slate-700 rounded w-20 mx-auto" />
          <div className="mt-6 h-[1px] bg-white/10" />
          <div className="mt-4 h-5 bg-slate-700 rounded w-32 mx-auto" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-center">{error}</p>
      ) : (
        <>
          {/* Avatar con iniciales */}
          <div className="mx-auto h-20 w-20 rounded-full bg-slate-600 flex items-center justify-center text-white text-2xl font-semibold select-none">
            {obtenerIniciales(usuario?.nombre)}
          </div>

          {/* Nombre */}
          <h3 className="mt-4 text-white text-xl text-center font-semibold">
            {usuario?.nombre || "Usuario"}
          </h3>

          {/* Email */}
          <p className="text-slate-300 text-sm text-center">
            {usuario?.email || "correo@ejemplo.com"}
          </p>

          {/* Rol */}
          <div className="mt-3 flex justify-center">
            <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-sm">
              {usuario?.rolNombre || "Sin rol"}
            </span>
          </div>

          {/* Separador */}
          <div className="mt-5 h-px bg-white/20" />

          {/* Botón Cerrar sesión */}
          <button
            onClick={cerrarSesion}
            className="mt-5 w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2 rounded transition"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </>
      )}
    </div>
  );
}

export default TarjetaPerfil;
