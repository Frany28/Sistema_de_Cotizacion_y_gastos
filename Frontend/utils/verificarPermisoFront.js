import api from "../src/api/index"; // Asegúrate que esta ruta sea correcta

export const verificarPermisoFront = async (nombrePermiso) => {
  try {
    const res = await api.get(`/usuarios/permisos/${nombrePermiso}`);
    return res.data.tienePermiso === true;
  } catch (err) {
    console.error("Error al verificar permiso:", err);
    return false;
  }
};
