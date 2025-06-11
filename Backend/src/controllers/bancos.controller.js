// controllers/bancos.controller.js
import db from "../config/database.js";

/**
 * Crear un nuevo banco
 */
export const crearBanco = async (req, res) => {
  const { nombre, moneda, tipo_identificador, identificador, estado } =
    req.body;

  try {
    // 1) Verificar duplicados (mismo nombre o misma cuenta/email)
    const [existe] = await db.execute(
      `SELECT id 
         FROM bancos 
        WHERE nombre = ? 
           OR (tipo_identificador = ? AND identificador = ?)`,
      [nombre.trim(), tipo_identificador, identificador.trim()]
    );

    if (existe.length > 0) {
      return res.status(409).json({ message: "Banco ya registrado" });
    }

    // 2) Insert parametrizado para evitar inyección SQL
    const [resultado] = await db.execute(
      `INSERT INTO bancos 
        (nombre, moneda, tipo_identificador, identificador, estado) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        moneda,
        tipo_identificador,
        identificador.trim(),
        estado || "activo",
      ]
    );

    // 3) Responder con datos del nuevo registro
    res.status(201).json({
      message: "Banco creado correctamente",
      id: resultado.insertId,
      nombre: nombre.trim(),
      moneda,
      tipo_identificador,
      identificador: identificador.trim(),
      estado: estado || "activo",
    });
  } catch (error) {
    console.error("Error crearBanco:", error);
    res
      .status(500)
      .json({ message: "Error al crear el banco", error: error.message });
  }
};

/**
 * Obtener todos los bancos (opcionalmente filtrados por tipo o estado)
 */
export const obtenerBancos = async (req, res) => {
  const { tipo_identificador, estado } = req.query;
  const condiciones = [];
  const params = [];

  if (tipo_identificador) {
    condiciones.push("tipo_identificador = ?");
    params.push(tipo_identificador);
  }
  if (estado) {
    condiciones.push("estado = ?");
    params.push(estado);
  }
  const where = condiciones.length ? "WHERE " + condiciones.join(" AND ") : "";

  try {
    const [bancos] = await db.execute(
      `SELECT * FROM bancos ${where} ORDER BY id DESC`,
      params
    );
    res.json({ bancos });
  } catch (error) {
    console.error("Error obtenerBancos:", error);
    res.status(500).json({ message: "Error al obtener los bancos" });
  }
};

/**
 * Obtener un banco por su ID
 */
export const obtenerBancoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const [filas] = await db.execute("SELECT * FROM bancos WHERE id = ?", [id]);
    if (filas.length === 0)
      return res.status(404).json({ message: "Banco no encontrado" });
    res.json(filas[0]);
  } catch (error) {
    console.error("Error obtenerBancoPorId:", error);
    res.status(500).json({ message: "Error al obtener el banco" });
  }
};

/**
 * Actualizar un banco
 */
export const actualizarBanco = async (req, res) => {
  const { id } = req.params;
  const { nombre, moneda, tipo_identificador, identificador, estado } =
    req.body;

  try {
    const [resultado] = await db.execute(
      `UPDATE bancos 
          SET nombre = ?, 
              moneda = ?, 
              tipo_identificador = ?, 
              identificador = ?, 
              estado = ?, 
              actualizado_en = CURRENT_TIMESTAMP 
        WHERE id = ?`,
      [
        nombre.trim(),
        moneda,
        tipo_identificador,
        identificador.trim(),
        estado,
        id,
      ]
    );

    if (resultado.affectedRows === 0)
      return res.status(404).json({ message: "Banco no encontrado" });

    res.json({ message: "Banco actualizado correctamente", id });
  } catch (error) {
    console.error("Error actualizarBanco:", error);
    res.status(500).json({ message: "Error al actualizar el banco" });
  }
};

export const eliminarBanco = async (req, res) => {
  const { id } = req.params;
  try {
    // 1) Comprobar que existe y obtener su estado
    const [filas] = await db.execute("SELECT estado FROM bancos WHERE id = ?", [
      id,
    ]);
    if (filas.length === 0) {
      return res.status(404).json({ message: "Banco no encontrado" });
    }

    // 2) Validar que no esté activo
    if (filas[0].estado === "activo") {
      return res
        .status(400)
        .json({
          message: "No se puede eliminar un banco activo. Primero inactívelo.",
        });
    }

    // 3) Si pasó la validación, procedemos a borrar
    const [resultado] = await db.execute("DELETE FROM bancos WHERE id = ?", [
      id,
    ]);
    if (resultado.affectedRows === 0)
      return res.status(404).json({ message: "Banco no encontrado" });
    res.json({ message: "Banco eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminarBanco:", error);
    res.status(500).json({ message: "Error al eliminar el banco" });
  }
};
