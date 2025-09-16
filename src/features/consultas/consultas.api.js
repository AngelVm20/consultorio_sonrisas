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

  // Id recién insertado, a prueba de triggers
  const row = await db.select(
    `SELECT id_consulta FROM consultas ORDER BY id_consulta DESC LIMIT 1`
  );
  const id = row?.[0]?.id_consulta;
  if (!Number.isInteger(id)) throw new Error("No pude obtener id_consulta");
  return id;
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
  // ⚠️ No intentes borrar de 'fotos' primero: si la tabla no existe falla.
  await db.execute(`DELETE FROM consultas WHERE id_consulta = ?`, [id_consulta]);
  return true;
}

/* ------------------ FOTOS ------------------ */

export async function listarFotos(id_consulta) {
  const db = await getDb();
  try {
    // descripcion AS nota para mantener el shape que espera el front
    return await db.select(
      `SELECT id_foto, id_consulta, ruta_archivo, descripcion AS nota,
              COALESCE(orden, 1) AS orden
         FROM consulta_fotos
        WHERE id_consulta = ?
        ORDER BY orden ASC, id_foto ASC`,
      [id_consulta]
    );
  } catch (e) {
    // Si la tabla aún no existe, compórtate como "sin fotos"
    if (String(e?.message || e).includes("no such table")) return [];
    throw e;
  }
}

export async function agregarFoto(id_consulta, ruta_archivo, nota = "", orden = 1) {
  const db = await getDb();

  // Normaliza y valida
  const idNum = Number(id_consulta);
  const pathStr = typeof ruta_archivo === "string" ? ruta_archivo : "";
  const notaStr = nota == null ? "" : String(nota);
  const ordenNum = Number.isFinite(Number(orden)) ? Number(orden) : 1;

  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new Error(`agregarFoto: id_consulta inválido (${id_consulta})`);
  }
  if (!pathStr) {
    throw new Error(`agregarFoto: ruta_archivo vacío/ inválido (${ruta_archivo})`);
  }

  // SIEMPRE pasa un array (nunca null)
  await db.execute(
    `INSERT INTO consulta_fotos (id_consulta, ruta_archivo, descripcion, orden)
     VALUES (?, ?, ?, ?)`,
    [idNum, pathStr, notaStr, ordenNum]
  );

  const row = await db.select(`SELECT last_insert_rowid() AS id`);
  return row?.[0]?.id;
}

export async function borrarFoto(id_foto) {
  const db = await getDb();
  await db.execute(`DELETE FROM consulta_fotos WHERE id_foto = ?`, [id_foto]);
  return true;
}
