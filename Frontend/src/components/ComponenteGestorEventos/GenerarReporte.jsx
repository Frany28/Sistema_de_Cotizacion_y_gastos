import React from "react";
import imagenGestorEventos from "../../Styles/img/2810772-Photoroom-1.png";

export default function GenerarReporte({ onGenerarReporte, urlImagen }) {
  const manejarGenerarReporte = () => {
    if (typeof onGenerarReporte === "function") onGenerarReporte();
  };

  return (
    <section className="w-[1376px] rounded-2xl border border-white/10 bg-slate-900/70 p-6 md:p-8 shadow-xl shadow-black/20">
      <div className="grid items-center gap-8 md:grid-cols-2">
        {/* Columna izquierda: título, descripción y CTA */}
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Gestor de Eventos
          </h1>
          <p className="mt-3 text-slate-300">
            Realice un seguimiento de todas las adiciones, eliminaciones y
            reemplazos de sus archivos en todo el sistema en tiempo real.
          </p>

          <button
            type="button"
            onClick={manejarGenerarReporte}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 active:bg-indigo-600"
          >
            {/* Icono inline (sin librerías externas) */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7l3-7z" />
            </svg>
            Generar Reporte
          </button>
        </div>

        {/* Columna derecha: contenedor de imagen/ilustración */}
        <div className="relative">
          {/* Glow decorativo */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-700">
            <img
              src={imagenGestorEventos}
              alt="Ilustración de seguimiento de eventos"
              className="h-[340px] w-[418px] object-contain p-6"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
