import Database from "@tauri-apps/plugin-sql";

let db = null;

export async function getDb() {
  // Evita usar plugin SQL fuera de Tauri (p.ej. navegador)
  const isTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  if (!isTauri) {
    throw new Error("Esta pantalla debe ejecutarse en la app de escritorio (Tauri). Usa `npm run tauri:dev`.");
  }

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