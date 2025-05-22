import db from "../config/database.js";

export const listaCuentasPorCobrar = async (req, res) => {
  // 1) Parseo seguro de page, limit y extracción de cliente_id
  const page = Number.isNaN(Number(req.query.page))
    ? 1
    : Number(req.query.page);
  const limit = Number.isNaN(Number(req.query.limit))
    ? 10
    : Number(req.query.limit);
  const offset = (page - 1) * limit;
  const { cliente_id } = req.query;

  if (!cliente_id) {
    return res.status(400).json({ message: "cliente_id es requerido" });
  }

  try {
    // 2) Total de cuentas para este cliente (sin paginación)
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
         FROM cuentas_por_cobrar
        WHERE cliente_id = ?`,
      [cliente_id]
    );

    // 3) Datos paginados inyectando limit y offset
    const [cuentas] = await db.query(
      `
      SELECT 
        cxc.id,
        cxc.codigo,
        cxc.cotizacion_id,
        cli.nombre AS cliente_nombre,
        cxc.monto,
        cxc.estado,
        cxc.fecha_emision,
        cxc.fecha_vencimiento
      FROM cuentas_por_cobrar cxc
      JOIN clientes cli ON cli.id = cxc.cliente_id
      WHERE cxc.cliente_id = ?
      ORDER BY cxc.fecha_vencimiento ASC
      LIMIT ${limit} OFFSET ${offset}
      `,
      [cliente_id]
    );

    // 4) Respuesta con paginación
    return res.json({
      cuentas, // las filas de esta página
      total, // total de registros disponibles
      page, // página actual
      limit, // tamaño de página
    });
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener cuentas por cobrar" });
  }
};

export const clientesConCXC = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT DISTINCT 
        cli.id,
        cli.codigo_referencia,
        cli.nombre
      FROM cuentas_por_cobrar cxc
      JOIN clientes cli ON cli.id = cxc.cliente_id
      JOIN cotizaciones cot ON cot.id = cxc.cotizacion_id
      WHERE cot.estado = 'aprobada'
      ORDER BY cli.nombre ASC

      `
    );

    res.json(rows);
  } catch (error) {
    console.error(
      "Error al obtener clientes con cuentas aprobadas por cobrar:",
      error
    );
    res
      .status(500)
      .json({ message: "Error al obtener clientes con CXC aprobadas" });
  }
};

export const getTotalesPorCliente = async (req, res) => {
  const { cliente_id } = req.params;

  try {
    if (!cliente_id) {
      return res.status(400).json({ message: "Cliente no especificado" });
    }

    // 1. Total DEBE (cuentas por cobrar activas)
    const [debeResult] = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS debe
       FROM cuentas_por_cobrar
       WHERE cliente_id = ? AND estado != 'pagado'`,
      [cliente_id]
    );

    const debe = parseFloat(debeResult[0].debe);

    // 2. Total HABER (abonos hechos en USD)
    const [haberResult] = await db.query(
      `SELECT COALESCE(SUM(monto_usd_calculado), 0) AS haber
       FROM abonos_cuentas
       WHERE cuenta_id IN (
         SELECT id FROM cuentas_por_cobrar WHERE cliente_id = ?
       )`,
      [cliente_id]
    );

    const haber = parseFloat(haberResult[0].haber);

    // 3. SALDO = DEBE - HABER
    const saldo = parseFloat((debe - haber).toFixed(2));

    res.json({ debe, haber, saldo });
  } catch (error) {
    console.error("Error al calcular totales del cliente:", error);
    res.status(500).json({ message: "Error al calcular totales" });
  }
};
