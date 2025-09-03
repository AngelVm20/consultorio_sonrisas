import { getDb } from "../../lib/db";

// Util: last insert id en SQLite
async function lastInsertId(db) {
  const r = await db.select("SELECT last_insert_rowid() AS id");
  return r?.[0]?.id;
}

// CONSULTAS
export async function listarConsultasPorPaciente(id_paciente) {
  const db = await getDb();
  return db.select(
    `SELECT * FROM consultas WHERE id_paciente=? ORDER BY date(fecha_consulta) DESC, id_consulta DESC`,
    [id_paciente]
  );
}

export async function detalleConsulta(id_consulta) {
  const db = await getDb();
  const rows = await db.select(`SELECT * FROM consultas WHERE id_consulta=?`, [id_consulta]);
  return rows?.[0] || null;
}

export async function crearConsulta(data) {
  // data: { id_paciente, motivo, procedimiento, ingreso, detalle, fecha_consulta }
  const db = await getDb();
  await db.execute(
    `INSERT INTO consultas (id_paciente, motivo, procedimiento, ingreso, detalle, fecha_consulta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.id_paciente,
      data.motivo ?? null,
      data.procedimiento ?? null,
      Number(data.ingreso || 0),
      data.detalle ?? null,
      data.fecha_consulta,
    ]
  );
  const id_consulta = await lastInsertId(db);

  // asiento en caja si aplica
  const ingresoNum = Number(data.ingreso || 0);
  if (ingresoNum > 0) {
    await db.execute(
      `INSERT INTO caja_movimientos (fecha, tipo, monto, fuente, id_paciente, id_consulta, nota)
       VALUES (?, 'INGRESO', ?, 'CONSULTA', ?, ?, 'Ingreso por consulta')`,
      [data.fecha_consulta, ingresoNum, data.id_paciente, id_consulta]
    );
  }
  return id_consulta;
}

export async function actualizarConsulta(id_consulta, data) {
  const db = await getDb();
  await db.execute(
    `UPDATE consultas
       SET motivo=?, procedimiento=?, ingreso=?, detalle=?, fecha_consulta=?, actualizado_en=datetime('now')
     WHERE id_consulta=?`,
    [
      data.motivo ?? null,
      data.procedimiento ?? null,
      Number(data.ingreso || 0),
      data.detalle ?? null,
      data.fecha_consulta,
      id_consulta,
    ]
  );

  // Reconciliar asiento en caja: borrar existentes para esta consulta y recrear si ingreso>0
  await db.execute(`DELETE FROM caja_movimientos WHERE id_consulta=?`, [id_consulta]);
  const ingresoNum = Number(data.ingreso || 0);
  if (ingresoNum > 0) {
    // necesitamos id_paciente para el asiento
    const row = (await db.select(`SELECT id_paciente FROM consultas WHERE id_consulta=?`, [id_consulta]))?.[0];
    const id_paciente = row?.id_paciente ?? null;
    await db.execute(
      `INSERT INTO caja_movimientos (fecha, tipo, monto, fuente, id_paciente, id_consulta, nota)
       VALUES (?, 'INGRESO', ?, 'CONSULTA', ?, ?, 'Ingreso por consulta (edit)')`,
      [data.fecha_consulta, ingresoNum, id_paciente, id_consulta]
    );
  }
}

export async function borrarConsulta(id_consulta) {
  const db = await getDb();
  // por FK se borran fotos; limpiar caja
  await db.execute(`DELETE FROM caja_movimientos WHERE id_consulta=?`, [id_consulta]);
  await db.execute(`DELETE FROM consultas WHERE id_consulta=?`, [id_consulta]);
}

// FOTOS
export async function listarFotos(id_consulta) {
  const db = await getDb();
  return db.select(
    `SELECT * FROM consulta_fotos WHERE id_consulta=? ORDER BY COALESCE(orden, 9999), id_foto`,
    [id_consulta]
  );
}

export async function agregarFoto(id_consulta, ruta_archivo, descripcion = "", orden = null) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO consulta_fotos (id_consulta, ruta_archivo, descripcion, orden) VALUES (?, ?, ?, ?)`,
    [id_consulta, ruta_archivo, descripcion || null, orden]
  );
}

export async function borrarFoto(id_foto) {
  const db = await getDb();
  await db.execute(`DELETE FROM consulta_fotos WHERE id_foto=?`, [id_foto]);
}
