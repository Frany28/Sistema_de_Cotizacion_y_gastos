import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const usuario = res.data.usuario;

      if (recordar) {
        localStorage.setItem("usuario", JSON.stringify(usuario));
      } else {
        sessionStorage.setItem("usuario", JSON.stringify(usuario));
      }

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
            placeholder="Email address"
            className="bg-gray-700 text-gray-200 border-0 rounded-md p-2 mb-4 focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ease-in-out duration-150"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            placeholder="Password"
            className="bg-gray-700 text-gray-200 border-0 rounded-md p-2 mb-4 focus:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ease-in-out duration-150"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between flex-wrap">
            <label
              className="text-sm text-gray-200 cursor-pointer"
              htmlFor="remember-me"
            >
              <input
                className="mr-2"
                id="remember-me"
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
              />
              Remember me
            </label>
            <a
              className="text-sm text-blue-500 hover:underline mb-0.5"
              href="#"
            >
              Forgot password?
            </a>
            <p className="text-white mt-4">
              Don't have an account?{" "}
              <a
                className="text-sm text-blue-500 hover:underline mt-4"
                href="#"
              >
                Signup
              </a>
            </p>
          </div>

          <button
            className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold py-2 px-4 rounded-md mt-4 hover:bg-indigo-600 hover:to-blue-600 transition ease-in-out duration-150"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
