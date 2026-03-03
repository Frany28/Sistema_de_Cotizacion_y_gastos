// Backend/src/utils/cacheMemoria.js  (versión ES Modules)
import NodeCache from "node-cache";

const cacheMemoria = new NodeCache({
  stdTTL: 300, // 5 min
  checkperiod: 120, // purga cada 2 min
});

// -----------------------------------------------------------------------------
// Helpers de cache (NO inventan nada: usan solo req.user.rol_id y req.user.sucursal_id)
// Convención de llaves recomendada: <prefijo>_<scopeSucursal>_...
//  - Admin (rol_id === 1): scope = sucursal_id de query si viene, si no "todas"
//  - No admin: scope = req.user.sucursal_id
// -----------------------------------------------------------------------------
export const obtenerScopeSucursalCache = (req) => {
  const rolId = Number(req?.user?.rol_id);
  const esAdmin = rolId === 1;

  if (esAdmin) {
    const sucursalIdQuery = req?.query?.sucursal_id;
    const sucursalId = Number(sucursalIdQuery);
    if (
      sucursalIdQuery !== undefined &&
      !Number.isNaN(sucursalId) &&
      sucursalId > 0
    ) {
      return String(sucursalId);
    }
    return "todas";
  }

  const sucursalIdUsuario = Number(req?.user?.sucursal_id);
  if (!sucursalIdUsuario || Number.isNaN(sucursalIdUsuario)) return null;
  return String(sucursalIdUsuario);
};

export const invalidarCachePorPrefijos = ({
  prefijos = [],
  scopeSucursal = null,
}) => {
  const llaves = cacheMemoria.keys();
  const llavesABorrar = [];

  for (const llave of llaves) {
    const coincidePrefijo = prefijos.some((p) => llave.startsWith(p));
    if (!coincidePrefijo) continue;

    if (scopeSucursal) {
      // Formato esperado: <prefijo>_<scopeSucursal>_
      const scopeMarcador = `_${scopeSucursal}_`;
      if (!llave.includes(scopeMarcador)) continue;
    }

    llavesABorrar.push(llave);
  }

  if (llavesABorrar.length) cacheMemoria.del(llavesABorrar);
};

export default cacheMemoria;
