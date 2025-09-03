import Database from "@tauri-apps/plugin-sql";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir } from "@tauri-apps/plugin-fs";

let db;
export async function getDb() {
  if (!db) {
    const base = await appDataDir();                 // p.ej. C:\Users\...\AppData\Roaming\<tu-app>\
    const dir  = await join(base, "odontoclinic");   // subcarpeta propia
    await mkdir(dir, { recursive: true }).catch(()=>{});
    const file = await join(dir, "clinic.db");
    db = await Database.load(`sqlite:${file}`);
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(db) {
  try {
    const res = await fetch("/migrations.sql");
    if (!res.ok) return;
    const sql = await res.text();
    for (const st of sql.split(/;\s*$/m).map(s=>s.trim()).filter(Boolean)) {
      await db.execute(st);
    }
  } catch (e) { console.error("migrations", e); }
}