import { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil } from "lucide-react";

export default function ModalEditar({
  titulo = "Editar",
  campos = [],
  datosIniciales = {},
  onSubmit,
  onCancel,
  onClose,
}) {
  const [form, setForm] = useState(datosIniciales || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
   
    setForm(datosIniciales || {});
  }, [datosIniciales]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose?.() || onCancel?.();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md p-6  bg-gray-800 rounded-lg shadow"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="cursor-pointer absolute top-3 right-3 text-gray-400  hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-4">
            <Pencil className="mx-auto mb-2 text-blue-600 w-10 h-10" />
            <h3 className="text-lg font-semibold  text-white">{titulo}</h3>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {campos.map((campo) => (
              <div key={campo.name} className={campo.className || "col-span-2"}>
                <label className="block text-sm font-medium  text-gray-300 mb-1">
                  {campo.label}
                </label>
                {campo.type === "select" ? (
                  <select
                    name={campo.name}
                    value={String(form[campo.name] ?? "")}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border  border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                    disabled={isSubmitting}
                  >
                    {campo.options?.map((opt) => {
                      const value = typeof opt === "string" ? opt : opt.value;
                      const label =
                        typeof opt === "string"
                          ? opt.charAt(0).toUpperCase() + opt.slice(1)
                          : opt.label;

                      return (
                        <option key={value} value={String(value)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type={campo.type || "text"}
                    name={campo.name}
                    value={form[campo.name] || ""}
                    onChange={handleChange}
                    placeholder={campo.placeholder || ""}
                    className="w-full px-3 py-2 border  border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                    disabled={isSubmitting}
                  />
                )}
              </div>
            ))}

            <div className="col-span-2 flex justify-center gap-2 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
