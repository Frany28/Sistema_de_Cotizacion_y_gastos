import { useState, useEffect } from "react";
import api from "../../api/index";
import { motion, AnimatePresence } from "framer-motion";
import { PlusSquare } from "lucide-react";

const regexNombre = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]+$/;
const regexPrecio = /^\d+(\.\d{1,2})?$/;

export default function ModalAñadirServicioProducto({
  onCancel,
  onSubmit,
  onSuccess,
}) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: 0,
    tipo: "servicio",
    cantidad_actual: 0,
    porcentaje_iva: "",
  });

  const [precioCentavos, setPrecioCentavos] = useState(0);
  const [precioTexto, setPrecioTexto] = useState("0,00");

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // ───── Sincronizar form.precio y texto visible a partir de centavos ─────
  useEffect(() => {
    const entero = Math.floor(precioCentavos / 100);
    const decimales = precioCentavos % 100;

    const enterosFormateados = entero.toLocaleString("es-VE", {
      maximumFractionDigits: 0,
    });

    const texto = `${enterosFormateados},${decimales
      .toString()
      .padStart(2, "0")}`;
    setPrecioTexto(texto);

    const numeroString = (precioCentavos / 100).toFixed(2); // "1234.56"
    setForm((prev) => ({
      ...prev,
      precio: numeroString,
    }));
  }, [precioCentavos]);

  // ───── Inicializar precioCentavos si algún día editas con valor existente ─────
  useEffect(() => {
    if (
      form.precio !== undefined &&
      form.precio !== null &&
      form.precio !== ""
    ) {
      const num = Number(form.precio);
      if (!isNaN(num)) {
        const cent = Math.round(num * 100);
        setPrecioCentavos(cent);
      }
    } else {
      setPrecioCentavos(0);
    }
  }, []); // solo al montar

  const handleKeyDownPrecio = (e) => {
    const { key } = e;

    // Permitir tabulaciones
    if (key === "Tab") return;

    // Evitar envío con Enter
    if (key === "Enter") {
      e.preventDefault();
      return;
    }

    // Backspace: quitar último dígito
    if (key === "Backspace") {
      e.preventDefault();
      setPrecioCentavos((prev) => Math.floor(prev / 10));
      if (errors.precio) {
        setErrors((prev) => ({ ...prev, precio: "" }));
      }
      if (serverError) setServerError("");
      return;
    }

    // Digitos 0–9
    if (key >= "0" && key <= "9") {
      e.preventDefault();
      const digito = Number(key);
      setPrecioCentavos((prev) => {
        const nuevo = prev * 10 + digito;
        // Límite razonable para evitar desbordes (999.999.999.999,99)
        if (nuevo > 99999999999999) return prev;
        return nuevo;
      });
      if (errors.precio) {
        setErrors((prev) => ({ ...prev, precio: "" }));
      }
      if (serverError) setServerError("");
      return;
    }

    // Cualquier otra tecla se bloquea
    e.preventDefault();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // El precio se maneja SOLO por handleKeyDownPrecio
    if (name === "precio") {
      if (errors.precio) {
        setErrors({ ...errors, precio: "" });
      }
      if (serverError) setServerError("");
      return;
    }

    setForm({ ...form, [name]: value });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    if (serverError) setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (!regexNombre.test(form.nombre)) {
      newErrors.nombre = "El nombre contiene caracteres no válidos";
    } else if (form.nombre.length < 3 || form.nombre.length > 100) {
      newErrors.nombre = "El nombre debe tener entre 3 y 100 caracteres.";
    }

    if (!form.descripcion.trim()) {
      newErrors.descripcion = "La descripción es requerida";
    } else if (form.descripcion.length < 5 || form.descripcion.length > 255) {
      newErrors.descripcion =
        "La descripción debe tener entre 5 y 255 caracteres.";
    }

    if (!form.precio && form.precio !== 0) {
      newErrors.precio = "El precio es requerido";
    } else if (!regexPrecio.test(String(form.precio))) {
      newErrors.precio = "El precio debe ser un número válido (ej. 10.99)";
    } else if (parseFloat(form.precio) <= 0) {
      newErrors.precio = "El precio debe ser mayor a cero";
    } else if (parseFloat(form.precio) > 999999.99) {
      newErrors.precio = "El precio no puede exceder 999.999,99.";
    }

    if (!["0", "8", "16"].includes(form.porcentaje_iva)) {
      newErrors.porcentaje_iva =
        "Seleccione un tipo de impuesto válido (0, 8 o 16%).";
    }

    if (form.tipo === "producto") {
      if (
        !form.cantidad_actual ||
        isNaN(form.cantidad_actual) ||
        form.cantidad_actual < 0
      ) {
        newErrors.cantidad_actual = "Cantidad actual inválida";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkExisting = async () => {
    try {
      const response = await api.get("/servicios-productos/check", {
        params: { nombre: form.nombre.trim() },
        validateStatus: (status) => status < 500,
      });
      return response.data?.exists || false;
    } catch (error) {
      console.error("Error en verificación:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const exists = await checkExisting();
      if (exists) {
        setServerError("Ya existe un servicio/producto con este nombre");
        setIsSubmitting(false);
        return;
      }

      const datosEnviar = {
        ...form,
        precio: parseFloat(form.precio),
        porcentaje_iva: parseFloat(form.porcentaje_iva),
        estado: "activo",
      };

      if (form.tipo === "producto") {
        datosEnviar.cantidad_actual = parseInt(form.cantidad_actual);
        datosEnviar.cantidad_anterior = 0;
      } else {
        delete datosEnviar.cantidad_actual;
        delete datosEnviar.cantidad_anterior;
      }

      const response = await api.post("/servicios-productos", datosEnviar);

      if (response.status === 201) {
        onSubmit(response.data);
        onSuccess &&
          onSuccess({
            titulo: "Servicio/Producto añadido",
            mensaje: "Se registró exitosamente",
            textoBoton: "Entendido",
          });

        setForm({
          nombre: "",
          descripcion: "",
          precio: 0,
          tipo: "servicio",
          cantidad_actual: 0,
          porcentaje_iva: "",
        });
        setPrecioCentavos(0);
        setPrecioTexto("0,00");
        onCancel();
      }
    } catch (error) {
      console.error("Error al agregar servicio/producto:", error);
      setServerError(
        "Ocurrió un error. Verifique los datos e intente nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
      >
        <div className="relative p-4 w-full max-w-md max-h-full">
          <div className="relative rounded-lg shadow-sm bg-gray-800">
            <div className="flex flex-col items-center justify-center pt-6">
              <PlusSquare className="w-8 h-8 text-blue-500 mb-1" />
              <h3 className="text-lg font-semibold text-white text-center">
                Añadir Servicio/Producto
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer absolute right-4 top-4 text-gray-400 bg-transparent  rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center hover:bg-gray-700 hover:text-white"
              >
                <svg
                  className="w-3 h-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
                <span className="sr-only">Cerrar</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-5">
              <div className="grid gap-4 mb-4 grid-cols-2">
                {serverError && (
                  <div className="col-span-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {serverError}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Nombre
                  </label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Nombre del servicio o producto"
                    className="text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-sm">{errors.nombre}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Descripción del servicio o producto"
                    rows="3"
                    className=" text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  />
                  {errors.descripcion && (
                    <p className="text-red-500 text-sm">{errors.descripcion}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Precio
                  </label>
                  <input
                    type="text"
                    name="precio"
                    value={precioTexto}
                    onKeyDown={handleKeyDownPrecio}
                    onChange={handleChange}
                    className="text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  />
                  {errors.precio && (
                    <p className="text-red-500 text-sm">{errors.precio}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Tipo de Impuesto
                  </label>
                  <select
                    name="porcentaje_iva"
                    value={form.porcentaje_iva}
                    onChange={handleChange}
                    className="cursor-pointer text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  >
                    <option value="">Seleccione un tipo de impuesto</option>
                    <option value="0">Exento (0%)</option>
                    <option value="8">Reducido (8%)</option>
                    <option value="16">No Exento (16%)</option>
                  </select>
                  {errors.porcentaje_iva && (
                    <p className="text-red-500 text-sm">
                      {errors.porcentaje_iva}
                    </p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-2 text-sm font-medium  text-white">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleChange}
                    className="cursor-pointer text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    required
                  >
                    <option value="servicio">Servicio</option>
                    <option value="producto">Producto</option>
                  </select>
                </div>

                {form.tipo === "producto" && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block mb-2 text-sm font-medium text-white">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      name="cantidad_actual"
                      value={form.cantidad_actual}
                      onChange={handleChange}
                      className="text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-500 text-white"
                    />
                    {errors.cantidad_actual && (
                      <p className="text-red-500 text-sm">
                        {errors.cantidad_actual}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`cursor-pointer text-white inline-flex items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : " bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                }`}
              >
                <svg
                  className="me-1 -ms-1 w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                {isSubmitting ? "Guardando..." : "Guardar Servicio/Producto"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
