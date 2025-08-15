// src/components/GraficoTendenciasActividad.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { obtenerTendenciaActividad } from "../services/eventosArchivosApi";

const coloresSerie = {
  subidos: { trazo: "#818CF8", relleno: "rgba(99,102,241,0.55)" },
  eliminados: { trazo: "#F87171", relleno: "rgba(239,68,68,0.55)" },
  reemplazados: { trazo: "#D1D5DB", relleno: "rgba(229,231,235,0.60)" },
};

const  nombreMesCortoEsp = (indiceMes0a11) =>
  [
    "Ene",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][indiceMes0a11];

const formatearMiles = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n ?? 0);

const obtenerRangoMeses = (fechaMin, fechaMax) => {
  // retorna [{anio, mes, clave:'YYYY-MM'}] desde min hasta max (inclusive)
  const ini = new Date(fechaMin.getFullYear(), fechaMin.getMonth(), 1);
  const fin = new Date(fechaMax.getFullYear(), fechaMax.getMonth(), 1);
  const lista = [];
  for (let f = new Date(ini); f <= fin; f.setMonth(f.getMonth() + 1)) {
    lista.push({
      anio: f.getFullYear(),
      mes: f.getMonth(),
      clave: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return lista;
};

const agruparSerieDiariaPorMes = (serieDiaria) => {
  if (!serieDiaria?.length)
    return { datos: [], fechaMin: null, fechaMax: null };

  // min y max reales en base a la serie devuelta por backend
  const fechas = serieDiaria.map((r) => new Date(r.fecha));
  const fechaMin = new Date(Math.min(...fechas));
  const fechaMax = new Date(Math.max(...fechas));

  const mapa = new Map();
  for (const r of serieDiaria) {
    const f = new Date(r.fecha);
    const clave = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    const acc = mapa.get(clave) || {
      subidos: 0,
      eliminados: 0,
      reemplazados: 0,
    };
    acc.subidos += Number(r.subidas) || 0;
    acc.eliminados += Number(r.eliminaciones) || 0;
    acc.reemplazados += Number(r.sustituciones) || 0; // “sustitucion” => “reemplazados”
    mapa.set(clave, acc);
  }

  const meses = obtenerRangoMeses(fechaMin, fechaMax);
  const datos = meses.map((m) => {
    const val = mapa.get(m.clave) || {
      subidos: 0,
      eliminados: 0,
      reemplazados: 0,
    };
    return {
      etiquetaMes:  nombreMesCortoEsp(m.mes),
      ...val,
    };
  });

  return { datos, fechaMin, fechaMax };
};

const TooltipPersonalizado = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = Object.fromEntries(payload.map((it) => [it.dataKey, it.value]));
  return (
    <div className="rounded-md bg-gray-900/90 text-gray-100 p-3 text-sm shadow-lg border border-gray-800">
      <div className="font-medium mb-1">{label}</div>
      <div className="flex flex-col gap-0.5">
        <span>Archivos Subidos: {formatearMiles(p.subidos)}</span>
        <span>Archivos Eliminados: {formatearMiles(p.eliminados)}</span>
        <span>Archivos Reemplazados: {formatearMiles(p.reemplazados)}</span>
      </div>
    </div>
  );
};

const Leyenda = () => (
  <div className="flex items-center gap-6 text-sm">
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: coloresSerie.subidos.trazo }}
      />
      <span>Archivos Subidos</span>
    </div>
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: coloresSerie.eliminados.trazo }}
      />
      <span>Archivos Eliminados</span>
    </div>
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: coloresSerie.reemplazados.trazo }}
      />
      <span>Archivos Reemplazados</span>
    </div>
  </div>
);

export default function GraficoTendenciasActividad({
  registroTipo = null,
  accion = null, // opcional: filtrar por acción
  usarHistoricoCompleto = true, // si true, pedimos todo=1
  claseContenedor = "",
}) {
  const [estaCargando, setEstaCargando] = useState(true);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [datosMensuales, setDatosMensuales] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setEstaCargando(true);
        setErrorMensaje("");

        const respuesta = await obtenerTendenciaActividad({
          registroTipo: registroTipo || undefined,
          accion: accion || undefined,
          todo: usarHistoricoCompleto ? "1" : undefined,
          // Si quisieras acotar manualmente: desde:"2025-01-01", hasta:"2025-08-31"
        });

        const { datos } = agruparSerieDiariaPorMes(respuesta.serie || []);
        setDatosMensuales(datos);
      } catch (e) {
        setErrorMensaje("No se pudo cargar la tendencia de actividad.");
        console.error(e);
      } finally {
        setEstaCargando(false);
      }
    };
    cargar();
  }, [registroTipo, accion, usarHistoricoCompleto]);

  const maxEscala = useMemo(() => {
    return Math.max(
      100,
      Math.ceil(
        datosMensuales.reduce(
          (m, d) =>
            Math.max(
              m,
              (d.subidos || 0) + (d.eliminados || 0) + (d.reemplazados || 0)
            ),
          0
        ) * 1.15
      )
    );
  }, [datosMensuales]);

  return (
    <div
      className={`w-full rounded-xl border border-gray-800 bg-[#0f172a] p-4 ${claseContenedor}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-100 font-semibold">Tendencias de actividad</h3>
        <Leyenda />
      </div>

      {estaCargando ? (
        <div className="h-56 animate-pulse rounded-lg bg-gray-800/40" />
      ) : errorMensaje ? (
        <div className="h-56 flex items-center justify-center text-red-300 text-sm">
          {errorMensaje}
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={datosMensuales}
              margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradSubidos" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={coloresSerie.subidos.trazo}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={coloresSerie.subidos.trazo}
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="gradEliminados" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={coloresSerie.eliminados.trazo}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={coloresSerie.eliminados.trazo}
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient
                  id="gradReemplazados"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={coloresSerie.reemplazados.trazo}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={coloresSerie.reemplazados.trazo}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 6" stroke="#334155" />
              <XAxis
                dataKey="etiquetaMes"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                domain={[0, maxEscala]}
                tickFormatter={formatearMiles}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <Tooltip content={<TooltipPersonalizado />} />

              <Area
                type="monotone"
                dataKey="subidos"
                stackId="1"
                stroke={coloresSerie.subidos.trazo}
                fill="url(#gradSubidos)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="eliminados"
                stackId="1"
                stroke={coloresSerie.eliminados.trazo}
                fill="url(#gradEliminados)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="reemplazados"
                stackId="1"
                stroke={coloresSerie.reemplazados.trazo}
                fill="url(#gradReemplazados)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
