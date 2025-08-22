// src/components/GestorEventos/ModalOpcionesReporte.jsx
import { AnimatePresence, motion } from "framer-motion";
import { X, Calendar, CalendarRange, CalendarClock } from "lucide-react";
import { useState } from "react";

export default function ModalOpcionesReporte({
  visible,
  onClose,
  onConfirmar, // recibe (payloadSeleccion)
}) {
  const [tipoReporte, setTipoReporte] = useState("mensual");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const confirmar = () => {
    const payload = { tipoReporte };
    if (tipoReporte === "mensual") Object.assign(payload, { mes, anio });
    if (tipoReporte === "anual") Object.assign(payload, { anio });
    if (tipoReporte === "rango") {
      if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
        alert("Selecciona un rango válido (fecha fin ≥ fecha inicio).");
        return;
      }
      Object.assign(payload, { fechaInicio, fechaFin });
    }
    onConfirmar?.(payload);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg rounded-xl bg-gray-800 border border-white/10 shadow-xl p-6"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-white font-semibold text-lg mb-1">
              Generar reporte
            </h3>
            <p className="text-gray-300 text-sm mb-5">
              Seleccione el tipo de periodo para el informe en PDF.
            </p>

            {/* selector de tipo */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { id: "mensual", icon: CalendarClock, label: "Mensual" },
                { id: "anual", icon: Calendar, label: "Anual" },
                { id: "rango", icon: CalendarRange, label: "Rango" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTipoReporte(id)}
                  className={`cursor-pointer flex items-center gap-2 justify-center rounded-lg px-3 py-2 border transition
                    ${
                      tipoReporte === id
                        ? "bg-indigo-500 text-white border-indigo-400"
                        : "bg-gray-700/60 text-gray-200 border-gray-600 hover:bg-gray-700"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>

            {/* controles según tipo */}
            {tipoReporte === "mensual" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Mes
                  </label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
                  />
                </div>
              </div>
            )}

            {tipoReporte === "anual" && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">Año</label>
                <input
                  type="number"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
                />
              </div>
            )}

            {tipoReporte === "rango" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full rounded-md bg-gray-700 text-white text-sm px-3 py-2 border border-gray-600"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg bg-gray-700 text-white text-sm px-4 py-2 border border-gray-600 hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                className="cursor-pointer rounded-lg bg-indigo-500 text-white text-sm px-4 py-2 hover:bg-indigo-400"
              >
                Generar PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
