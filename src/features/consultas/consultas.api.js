import { getDb } from "../../lib/db";

/** Lista el historial de un paciente (order por fecha desc) */
export async function listarConsultasPorPaciente(id_paciente) {
  const db = await getDb();
  return await db.select(
    `SELECT id_consulta, id_paciente, motivo, procedimiento, ingreso, detalle, fecha_consulta
       FROM consultas
      WHERE id_paciente = ?
      ORDER BY date(fecha_consulta) DESC, id_consulta DESC`,
    [id_paciente]
  );
}

/** Detalle de una consulta */
export async function detalleConsulta(id_consulta) {
  const db = await getDb();
  const rows = await db.select(
    `SELECT id_consulta, id_paciente, motivo, procedimiento, ingreso, detalle, fecha_consulta
       FROM consultas
      WHERE id_consulta = ?`,
    [id_consulta]
  );
  return rows[0] || null;
}

/** Crea una consulta y devuelve su id */
export async function crearConsulta(data) {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO consultas (id_paciente, motivo, procedimiento, ingreso, detalle, fecha_consulta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.id_paciente,
        data.motivo || null,
        data.procedimiento || null,
        data.ingreso ? Number(data.ingreso) : 0,
        data.detalle || null,
        data.fecha_consulta,
      ]
    );
    const row = await db.select(`SELECT last_insert_rowid() AS id`);
    return row?.[0]?.id;
  } catch (e) {
    console.error("crearConsulta error:", e);
    throw e;
  }
}

/** Actualiza una consulta (devuelve true/false) */
export async function actualizarConsulta(id_consulta, data) {
  const db = await getDb();
  const res = await db.execute(
    `UPDATE consultas
        SET motivo = ?, procedimiento = ?, ingreso = ?, detalle = ?, fecha_consulta = ?
      WHERE id_consulta = ?`,
    [
      data.motivo || null,
      data.procedimiento || null,
      data.ingreso ? Number(data.ingreso) : 0,
      data.detalle || null,
      data.fecha_consulta,
      id_consulta,
    ]
  );
  return !!res;
}

/** Borra una consulta y sus fotos */
export async function borrarConsulta(id_consulta) {
  const db = await getDb();
  // primero borra fotos (FK ON DELETE CASCADE también sirve si lo definiste)
  await db.execute(`DELETE FROM fotos WHERE id_consulta = ?`, [id_consulta]);
  await db.execute(`DELETE FROM consultas WHERE id_consulta = ?`, [id_consulta]);
  return true;
}

/* ------------------ FOTOS ------------------ */

export async function listarFotos(id_consulta) {
  const db = await getDb();
  return await db.select(
    `SELECT id_foto, id_consulta, ruta_archivo, nota, orden
       FROM fotos
      WHERE id_consulta = ?
      ORDER BY orden ASC, id_foto ASC`,
    [id_consulta]
  );
}

export async function agregarFoto(id_consulta, ruta_archivo, nota = "", orden = 1) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO fotos (id_consulta, ruta_archivo, nota, orden)
     VALUES (?, ?, ?, ?)`,
    [id_consulta, ruta_archivo, nota || "", orden || 1]
  );
  const row = await db.select(`SELECT last_insert_rowid() AS id`);
  return row?.[0]?.id;
}

export async function borrarFoto(id_foto) {
  const db = await getDb();
  await db.execute(`DELETE FROM fotos WHERE id_foto = ?`, [id_foto]);
  return true;
}
