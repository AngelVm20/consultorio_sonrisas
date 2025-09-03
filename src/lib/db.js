import Database from "@tauri-apps/plugin-sql";
let db = null;

export async function getDb() {
  if (!db) {
    db = await Database.load("sqlite:clinic.db");
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(db) {
  try {
    const res = await fetch("/migrations.sql");
    if (!res.ok) return;
    const sql = await res.text();
    const statements = sql.split(/;\s*$/m).map(s => s.trim()).filter(Boolean);
    for (const st of statements) {
      await db.execute(st);
    }
  } catch (e) {
    console.error("No se pudieron correr migraciones", e);
  }
}