// src/pages/Drive/ListaArchivosPapelera.jsx
import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  FileArchive,
  FileAudio,
  FileVideo,
  Image as IconoImagen,
  FileWarning,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import api from "../../api";

function ListaArchivosPapelera() {
  // ──────────────── Estado ────────────────
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // ──────────────── Cargar datos ────────────────
  useEffect(() => {
    const obtenerArchivos = async () => {
      try {
        const { data } = await api.get("/archivos/papelera", {
          withCredentials: true,
        });
        setArchivos(data);
      } catch (error) {
        console.error("Error al obtener archivos eliminados", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerArchivos();
  }, []);

  // ──────────────── Utilidades de formato ────────────────
  const formatoFecha = (fecha) => {
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    return isNaN(date.getTime())
      ? "-"
      : format(date, "yyyy-MM-dd", { locale: es });
  };

  const formatoTamano = (bytes) => {
    if (!bytes) return "-";
    const unidades = ["B", "KB", "MB", "GB"];
    let i = 0;
    let valor = bytes;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(i ? 1 : 0)} ${unidades[i]}`;
  };

  const iconoPorExtension = (ext) => {
    const e = ext?.toLowerCase();
    switch (e) {
      case "pdf":
      case "doc":
      case "docx":
      case "txt":
        return <FileText size={34} className="text-gray-300 mx-auto" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <IconoImagen size={34} className="text-blue-400 mx-auto" />;
      case "zip":
      case "rar":
        return <FileArchive size={34} className="text-yellow-500 mx-auto" />;
      case "mp3":
      case "wav":
        return <FileAudio size={34} className="text-yellow-300 mx-auto" />;
      case "mp4":
      case "avi":
        return <FileVideo size={34} className="text-purple-400 mx-auto" />;
      default:
        return <FileWarning size={34} className="text-gray-400 mx-auto" />;
    }
  };

  // ──────────────── Filtro por búsqueda ────────────────
  const archivosFiltrados = useMemo(
    () =>
      archivos.filter((a) =>
        a.nombreOriginal.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [archivos, busqueda]
  );

  // ──────────────── Loader ────────────────
  if (cargando) {
    return (
      <div className="w-full bg-[#1C2434] rounded-2xl p-4 animate-pulse h-64 shadow" />
    );
  }

  // ──────────────── Render ────────────────
  return (
    <div className="p-6">
      {/* ── Buscador opcional ── */}
      <div className="mb-6 max-w-xs">
        <input
          type="text"
          placeholder="Buscar archivo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-[#2F374C] placeholder-gray-400 text-sm text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── Grilla ── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-6 justify-center">
        {archivosFiltrados.length ? (
          archivosFiltrados.map((archivo) => (
            <div
              key={archivo.id}
              className="bg-[#1C2434] rounded-2xl h-[320px] w-[236px] border border-[#2F374C] shadow flex flex-col justify-between px-5 py-4 text-white transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Icono y títulos */}
              <div className="flex flex-col items-center text-center gap-2">
                {iconoPorExtension(archivo.extension)}

                <p className="font-semibold text-lg leading-tight line-clamp-2 break-words">
                  {archivo.nombreOriginal}
                </p>

                <p className="text-sm text-gray-400">
                  Eliminado: {formatoFecha(archivo.actualizadoEn)}
                </p>

                <p className="text-sm text-gray-400">
                  Tamaño: {formatoTamano(archivo.tamanioBytes)}
                </p>

                {/* Ruta original */}
                <p className="text-xs text-gray-500 mt-1 break-all">
                  Ruta Original:
                  <br />
                  {archivo.rutaOriginal || archivo.rutaS3 || "-"}
                </p>
              </div>

              {/* Botones */}
              <div className="flex justify-between gap-2 mt-4">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md px-4 py-2 w-[100px]"
                  onClick={() =>
                    console.log("Eliminar definitivamente", archivo.id)
                  }
                >
                  Eliminar
                </button>

                <button
                  className="bg-[#2F374C] hover:bg-[#3c465f] text-white text-sm font-medium rounded-md px-4 py-2 w-[100px]"
                  onClick={() => console.log("Restaurar", archivo.id)}
                >
                  Restaurar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-16 text-sm">
            {busqueda
              ? "No se encontraron resultados para tu búsqueda"
              : "No hay archivos en la papelera"}
          </div>
        )}
      </div>
    </div>
  );
}

export default ListaArchivosPapelera;
