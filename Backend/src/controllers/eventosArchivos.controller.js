// controllers/eventosArchivos.js
import db from "../config/database.js";

export const ROL_ADMIN = 1;
export const ROL_SUPERVISOR = 2;
export const ROL_EMPLEADO = 3;


export const listarEventosArchivos = async (req, res) => {
  const usuarioId = req.user.id;
  const rolId = req.user.rol_id;

  /* Admin y Supervisor obtienen vista completa */
  const esVistaCompleta = rolId === ROL_ADMIN || rolId === ROL_SUPERVISOR;

  /* Paginación */
  const limit = Number(req.query.limit) || 10;
  const offset = Number(req.query.offset) || 0;

  /* Acciones que interesan a la UI */
  const acciones = [
    "subida",
    "eliminacion",
    "sustitucion",
    "edicionMetadatos",
    "borradoDefinitivo",
  ];
  const params = [...acciones];

  /* WHERE base (por tipo de acción) */
  let whereSql = `WHERE e.accion IN (${acciones.map(() => "?").join(",")})`;

  /* Filtrado por dueño SOLO para Empleado */
  if (!esVistaCompleta) {
    // a.subidoPor = usuario que subió originalmente el archivo
    whereSql += " AND a.subidoPor = ?";
    params.push(usuarioId);
  }

  try {
    const [eventos] = await db.query(
      `SELECT a.nombreOriginal AS nombreArchivo,
              e.fechaHora      AS fechaEvento,
              e.accion         AS tipoEvento
         FROM eventosArchivo e
    JOIN archivos a ON a.id = e.archivoId
            ${whereSql}
     ORDER BY e.fechaHora DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ eventos, limit, offset });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error al listar eventos de archivos." });
  }
};

export const contarVersionesDelMes = async (req, res) => {
  const archivoId = req.params.id;

  const fechaInicio = new Date();
  fechaInicio.setDate(1);
  fechaInicio.setHours(0, 0, 0, 0);

  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  try {
    // 1. Obtener registroTipo y registroId del archivo base
    const [archivos] = await db.query(
      `SELECT registroTipo, registroId
         FROM archivos
        WHERE id = ?`,
      [archivoId]
    );

    if (!archivos.length) {
      return res.status(404).json({ mensaje: "Archivo no encontrado" });
    }

    const { registroTipo, registroId } = archivos[0];

    // 2. Contar cuántas versiones hay para ese documento en el mes actual
    const [conteo] = await db.query(
      `SELECT COUNT(*) AS totalDelMes
         FROM archivos
        WHERE registroTipo = ?
          AND registroId = ?
          AND creadoEn >= ? AND creadoEn < ?`,
      [registroTipo, registroId, fechaInicio, fechaFin]
    );

    res.json({ totalDelMes: conteo[0].totalDelMes });
  } catch (error) {
    console.error("Error al contar versiones del mes desde archivos:", error);
    res.status(500).json({ mensaje: "Error al contar versiones del mes" });
  }
};

export const obtenerAlmacenamientoTotal = async (req, res) => {
  const archivoId = req.params.id;

  try {
    // 1. Obtener registroTipo y registroId del archivo base
    const [resultado] = await db.query(
      `SELECT registroTipo, registroId
         FROM archivos
        WHERE id = ?`,
      [archivoId]
    );

    if (resultado.length === 0) {
      return res.status(404).json({ mensaje: "Archivo no encontrado" });
    }

    const { registroTipo, registroId } = resultado[0];

    // 2. Sumar tamaño de todas las versiones relacionadas
    const [suma] = await db.query(
      `SELECT SUM(tamanioBytes) AS totalBytes
         FROM archivos
        WHERE registroTipo = ? AND registroId = ?`,
      [registroTipo, registroId]
    );

    const totalBytes = suma[0].totalBytes || 0;

    res.json({ totalBytes });
  } catch (error) {
    console.error("Error al calcular almacenamiento total:", error);
    res.status(500).json({ mensaje: "Error al calcular almacenamiento total" });
  }
};
