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
    activa INTEGER DEFAULT 1,
    last_notified_at INTEGER DEFAULT 0,
    created_at INTEGER
  )
`);

export default db;
