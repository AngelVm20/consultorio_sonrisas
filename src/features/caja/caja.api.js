import { getDb } from "../../lib/db";

export async function agregarMovimiento({ fecha, tipo, monto, nota, fuente = null, id_paciente = null, id_consulta = null }) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO caja_movimientos (fecha, tipo, monto, fuente, id_paciente, id_consulta, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [fecha, tipo, Number(monto || 0), fuente, id_paciente, id_consulta, nota || null]
  );
}

export async function borrarMovimiento(id_mov) {
  const db = await getDb();
  await db.execute(`DELETE FROM caja_movimientos WHERE id_mov=?`, [id_mov]);
}

export async function listarMovimientos(fechaInicio, fechaFin) {
  const db = await getDb();
  return db.select(
    `SELECT * FROM caja_movimientos
     WHERE date(fecha) BETWEEN date(?) AND date(?)
     ORDER BY date(fecha), id_mov`,
    [fechaInicio, fechaFin]
  );
}

export async function resumenSemanas(fechaInicio, fechaFin) {
  const db = await getDb();
  // semana basada en lunes: %W
  return db.select(
    `SELECT
       strftime('%Y-W%W', fecha) AS semana_iso,
       MIN(fecha) AS desde,
       MAX(fecha) AS hasta,
       SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END) AS ingresos,
       SUM(CASE WHEN tipo='GASTO'   THEN monto ELSE 0 END) AS gastos,
       SUM(CASE WHEN tipo='INGRESO' THEN monto
                WHEN tipo='GASTO'   THEN -monto ELSE 0 END) AS saldo
     FROM caja_movimientos
     WHERE date(fecha) BETWEEN date(?) AND date(?)
     GROUP BY strftime('%Y-W%W', fecha)
     ORDER BY semana_iso`,
    [fechaInicio, fechaFin]
  );
}
