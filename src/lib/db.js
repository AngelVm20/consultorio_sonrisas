import Database from "@tauri-apps/plugin-sql";

let db = null;

export async function getDb() {
  const isTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  if (!isTauri) {
    throw new Error("Esta pantalla debe ejecutarse en la app de escritorio (Tauri). Usa `npm run tauri:dev`.");
  }

  if (!db) {
    db = await Database.load("sqlite:clinic.db");
    // Asegura FKs en ESTA conexión
    try { await db.execute("PRAGMA foreign_keys = ON"); } catch { }
    await runMigrations(db);
    // Por si las migraciones no se cargaron, crea tabla si no existe
    await db.execute(`
     CREATE TABLE IF NOT EXISTS consulta_fotos (
       id_foto INTEGER PRIMARY KEY AUTOINCREMENT,
       id_consulta INTEGER NOT NULL,
       ruta_archivo TEXT NOT NULL,
       descripcion TEXT,
       orden INTEGER,
       FOREIGN KEY (id_consulta) REFERENCES consultas(id_consulta) ON DELETE CASCADE
     )
   `);
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