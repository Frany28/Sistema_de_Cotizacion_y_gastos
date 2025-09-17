// src/components/GenerarReporte.jsx
import React from "react";
import imagenGestorEventos from "../../Styles/img/2810772-Photoroom-1.png";

export default function GenerarReporte({ onGenerarReporte, urlImagen }) {
  const manejarGenerarReporte = () => {
    
    if (typeof onGenerarReporte === "function") onGenerarReporte();
  };

  const rutaImagen = urlImagen || imagenGestorEventos;

  return (
    <section
      className="
        mx-auto
        w-full max-w-[1480px]
        rounded-[14px]
        border border-white/10
        bg-[#1F2937]
        shadow-xl shadow-black/20
        px-6 py-7 md:px-8 md:py-8
      "
      aria-label="Gestor de Eventos"
    >
      <div
        className="
          grid items-center justify-between
          gap-6 md:gap-8
          md:grid-cols-[1.1fr_0.9fr]
        "
      >
        {/* Columna izquierda: título, descripción y botón */}
        <div className="text-left">
          {/* TÍTULO */}
          <h1
            className="
              text-white
              font-semibold
              tracking-tight
              text-[28px] leading-[1.15]
              md:text-[32px]
            "
          >
            Gestor de Eventos
          </h1>

          {/* DESCRIPCIÓN */}
          <p
            className="
              mt-3
              text-slate-300
              text-[14.5px] leading-[1.6]
              md:text-[15px]
            "
          >
            Realice un seguimiento de todas las adiciones, eliminaciones y
            reemplazos de sus archivos en todo el sistema en tiempo real.
          </p>

          {/* BOTÓN */}
          <button
            type="button"
            onClick={manejarGenerarReporte}
            className="
              mt-6
              inline-flex items-center
              rounded-xl
              bg-indigo-500
              px-5 py-3
              text-[13.5px] font-medium text-white
              transition
              hover:bg-indigo-400
              focus:outline-none focus:ring-2 focus:ring-indigo-300
              active:bg-indigo-600
            "
          >
            <span className="mr-2">Generar Reporte</span>
            <span
              className="
                select-none
                text-[14px]
                leading-none
                translate-y-[0.5px]
              "
              aria-hidden="true"
            >
              🚀
            </span>
          </button>
        </div>

        {/* Columna derecha: ilustración */}
        <div className="relative flex items-center justify-end">
          {/* Imagen ajustada a las proporciones del mock */}
          <img
            src={rutaImagen}
            alt="Ilustración de seguimiento de eventos"
            className="
              h-[200px] w-auto
              md:h-[260px] lg:h-[300px] xl:h-[320px]
              object-contain
              drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]
            "
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}
