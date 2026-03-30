import { Database } from "bun:sqlite";

const db = new Database("./olivaxi.db");

db.exec("PRAGMA journal_mode=WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS clima_cache (
    id INTEGER PRIMARY KEY,
    datos TEXT,
    cached_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT,
    provincia TEXT,
    variedad TEXT,
    tipo TEXT DEFAULT 'calor',
    fenologia TEXT DEFAULT '',
    activa INTEGER DEFAULT 1,
    last_notified_at INTEGER DEFAULT 0,
    created_at INTEGER
  )
`);

// Migraciones no destructivas para instalaciones antiguas
const columnasAlertas = db.query("PRAGMA table_info(alertas)").all() as { name: string }[];
const tieneVariedad = columnasAlertas.some(c => c.name === "variedad");
const tieneFenologia = columnasAlertas.some(c => c.name === "fenologia");

if (!tieneVariedad) {
  db.exec("ALTER TABLE alertas ADD COLUMN variedad TEXT DEFAULT ''");
}

if (!tieneFenologia) {
  db.exec("ALTER TABLE alertas ADD COLUMN fenologia TEXT DEFAULT ''");
}

export default db;
