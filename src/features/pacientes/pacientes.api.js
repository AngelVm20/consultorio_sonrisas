import { getDb } from "../../lib/db";

export async function listarPacientes(q = "") {
  const db = await getDb();
  const where = q ? `WHERE apellidos LIKE ? OR nombres LIKE ? OR cedula LIKE ?` : ``;
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  return db.select(`SELECT * FROM pacientes ${where} ORDER BY apellidos, nombres`, params);
}

export async function crearPaciente(p) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO pacientes (nombres, apellidos, cedula, telefono, fecha_nacimiento, direccion)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [p.nombres, p.apellidos, p.cedula ?? null, p.telefono ?? null, p.fecha_nacimiento ?? null, p.direccion ?? null]
  );
}

export async function actualizarPaciente(id, p) {
  const db = await getDb();
  await db.execute(
    `UPDATE pacientes SET nombres=?, apellidos=?, cedula=?, telefono=?, fecha_nacimiento=?, direccion=?, actualizado_en=datetime('now')
     WHERE id_paciente=?`,
    [p.nombres, p.apellidos, p.cedula ?? null, p.telefono ?? null, p.fecha_nacimiento ?? null, p.direccion ?? null, id]
  );
}

export async function borrarPaciente(id) {
  const db = await getDb();
  await db.execute(`DELETE FROM pacientes WHERE id_paciente=?`, [id]);
}
