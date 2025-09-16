import db from "../config/database.js";
import cacheMemoria from "../utils/cacheMemoria.js";

const prefijosAlmacenamiento = {
  uso: "almUso_",
};

const borrarPorPrefijo = (prefijo) => {
  for (const clave of cacheMemoria.keys()) {
    if (clave.startsWith(prefijo)) cacheMemoria.del(clave);
  }
};

const construirClaveUso = (usuarioId) =>
  `${prefijosAlmacenamiento.uso}usuarioId=${usuarioId}`;


export const obtenerUsoAlmacenamiento = async (req, res) => {
  try {
    const usuarioId = req?.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ mensaje: "Sesión inválida." });
    }

    const claveCache = construirClaveUso(usuarioId);
    const forzarRefresh = String(req.query.refresh) === "1";

    if (!forzarRefresh) {
      const enCache = cacheMemoria.get(claveCache);
      if (enCache) return res.json(enCache);
    }

    // 1) Traer cuota y uso actuales desde BD
    const [[usuario]] = await db.query(
      "SELECT cuotaMb, usoStorageBytes FROM usuarios WHERE id = ?",
      [usuarioId]
    );
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // 2) Cálculos normalizados
    const usadoMb = +(usuario.usoStorageBytes / 1_048_576).toFixed(2);
    const cuotaMb = usuario.cuotaMb;
    const disponibleMb =
      cuotaMb !== null ? +Math.max(cuotaMb - usadoMb, 0).toFixed(2) : null;
    const porcentajeUso =
      cuotaMb !== null && cuotaMb > 0
        ? +((usadoMb / cuotaMb) * 100).toFixed(2)
        : null;

    const respuesta = {
      cuotaMb,
      usadoMb,
      disponibleMb,
      porcentajeUso,
    };

    // 3) Guardar en cache con TTL
    cacheMemoria.set(claveCache, respuesta, 45);

    // 4) Responder
    return res.json(respuesta);
  } catch (error) {
    console.error("Error en obtenerUsoAlmacenamiento:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno al consultar almacenamiento" });
  }
};


export const limpiarCacheAlmacenamiento = (usuarioId = null) => {
  if (usuarioId) {
    const clave = construirClaveUso(usuarioId);
    cacheMemoria.del(clave);
    return { ok: true, limpiado: clave };
  }
  borrarPorPrefijo(prefijosAlmacenamiento.uso);
  return { ok: true, limpiado: "todos" };
};


export const limpiarCacheAlmacenamientoHandler = async (req, res) => {
  try {
   
    const usuarioId = req.query.usuarioId ? Number(req.query.usuarioId) : null;
    const resultado = limpiarCacheAlmacenamiento(usuarioId);
    return res.json({ ok: true, ...resultado });
  } catch (error) {
    console.error("Error en limpiarCacheAlmacenamientoHandler:", error);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error al limpiar cache" });
  }
};
