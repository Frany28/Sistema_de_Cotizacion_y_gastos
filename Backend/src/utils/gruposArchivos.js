export const obtenerOcrearGrupoArchivo = async (
  conexion,
  registroTipo,
  registroId,
  usuarioId,
  nombreReferencia
) => {
  const [[g]] = await conexion.query(
    `SELECT id
       FROM archivoGrupos
      WHERE registroTipo = ? AND registroId = ?`,
    [registroTipo, registroId]
  );
  if (g) return g.id;

  const [res] = await conexion.query(
    `INSERT INTO archivoGrupos
       (registroTipo, registroId, creadoPor, nombreReferencia)
     VALUES (?, ?, ?, ?)`,
    [registroTipo, registroId, usuarioId, nombreReferencia]
  );
  return res.insertId;
};

/* Firma de empleados */
export const obtenerOcrearGrupoFirma = (conn, usuarioId, usuarioIdCreador) =>
  obtenerOcrearGrupoArchivo(
    conn,
    "firmas",
    usuarioId,
    usuarioIdCreador,
    `Firmas usuario ${usuarioId}`
  );

/* Abonos CxC */
export const obtenerOcrearGrupoAbono = (conn, abonoId, usuarioIdCreador) =>
  obtenerOcrearGrupoArchivo(
    conn,
    "abonosCXC",
    abonoId,
    usuarioIdCreador,
    `Comprobantes abono ${abonoId}`
  );

/* Comprobantes de pagos a proveedores */
export const obtenerOcrearGrupoComprobante = (
  conn,
  solicitudId,
  usuarioIdCreador
) =>
  obtenerOcrearGrupoArchivo(
    conn,
    "comprobantesPagos",
    solicitudId,
    usuarioIdCreador,
    `Comprobantes pago ${solicitudId}`
  );

/* Facturas de Gastos */
export const obtenerOcrearGrupoFactura = (conn, gastoId, usuarioIdCreador) =>
  obtenerOcrearGrupoArchivo(
    conn,
    "facturasGastos",
    gastoId,
    usuarioIdCreador,
    `Facturas gasto ${gastoId}`
  );
