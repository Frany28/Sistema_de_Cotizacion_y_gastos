import axios from "axios";

export const verificarPermisoFront = async (nombrePermiso) => {
  try {
    const res = await axios.get(
      `http://localhost:3000/api/usuarios/permisos/${nombrePermiso}`,
      { withCredentials: true }
    );
    return res.data.tienePermiso === true;
  } catch (err) {
    console.error("Error al verificar permiso:", err);
    return false;
  }
};
