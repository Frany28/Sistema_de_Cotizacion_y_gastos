import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/index.js";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Enviamos con credenciales por si la instancia no lo trae
      const { data } = await api.post(
        "/auth/login",
        { email, password },
        { withCredentials: true }
      );

      // Guardamos usuario en localStorage o sessionStorage
      const { usuario } = data;
      const storage = recordar ? localStorage : sessionStorage;
      storage.setItem("usuario", JSON.stringify(usuario));

      // Redirigimos al dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen dark">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-200 mb-4">Login</h2>

        <form className="flex flex-col" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 mb-2">{error}</p>}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-700 text-gray-200 border-0 rounded-md p-2 mb-4
                       focus:bg-gray-600 focus:outline-none focus:ring-1
                       focus:ring-blue-500 transition ease-in-out duration-150"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-700 text-gray-200 border-0 rounded-md p-2 mb-4
                       focus:bg-gray-600 focus:outline-none focus:ring-1
                       focus:ring-blue-500 transition ease-in-out duration-150"
          />

          <div className="flex items-center justify-between flex-wrap">
            <label
              htmlFor="remember-me"
              className="text-sm text-gray-200 cursor-pointer"
            >
              <input
                id="remember-me"
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="mr-2"
              />
              Remember me
            </label>

            <a
              href="#"
              className="text-sm text-blue-500 hover:underline mb-0.5"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="bg-blue-700 text-white font-bold py-2 px-4 rounded-md mt-4 hover:bg-blue-600
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-opacity-50 transition ease-in-out duration-150"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
