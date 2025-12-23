import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Loader2 } from "lucide-react";

export default function ModalElegirOrdenPago({
  visible = false,
  onClose,
  ordenesPago = [],
  cargando = false,
  error = null,
}) {
  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg p-5 bg-gray-800 rounded-lg shadow border border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-white font-semibold text-lg mb-3">
            Órdenes de pago
          </h3>

          {cargando && (
            <div className="flex items-center text-gray-300 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Cargando órdenes…
            </div>
          )}

          {!cargando && error && (
            <div className="text-red-300 text-sm">{error}</div>
          )}

          {!cargando && !error && ordenesPago.length === 0 && (
            <div className="text-gray-300 text-sm">
              No hay órdenes de pago registradas todavía.
            </div>
          )}

          {!cargando && !error && ordenesPago.length > 0 && (
            <div className="mt-3 space-y-2 max-h-[50vh] overflow-auto pr-1">
              {ordenesPago.map((orden, index) => {
                const pagoRealizadoId =
                  orden.pagoRealizadoId ??
                  orden.pago_realizado_id ??
                  orden.id ??
                  index;

                const numeroAbono =
                  orden.numeroAbono ?? orden.numero_abono ?? index + 1;

                const fechaPago = orden.fechaPago ?? orden.fecha_pago ?? "—";

                const monto =
                  orden.monto ?? orden.montoPagado ?? orden.monto_pagado ?? "—";

                const moneda = orden.moneda ?? "—";

                // Ideal: backend devuelve url lista (firmada)
                const urlPdf = orden.urlPdf ?? orden.url_pdf ?? null;

                return (
                  <div
                    key={String(pagoRealizadoId)}
                    className="flex items-center justify-between rounded-xl bg-gray-900/50 border border-gray-700 p-3"
                  >
                    <div className="text-sm">
                      <div className="text-white font-medium">
                        Abono #{numeroAbono}
                      </div>
                      <div className="text-gray-300">
                        Fecha: {fechaPago} · Monto: {monto} {moneda}
                      </div>
                    </div>

                    <button
                      onClick={() => urlPdf && window.open(urlPdf, "_blank")}
                      className={`px-3 py-2 rounded-lg text-white text-sm font-medium flex items-center
                        ${
                          urlPdf
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-gray-600 cursor-not-allowed opacity-70"
                        }`}
                      disabled={!urlPdf}
                      title={!urlPdf ? "Sin PDF disponible" : "Ver PDF"}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver PDF
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
