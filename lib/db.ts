import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH || "app.db";
const db = new Database(path.resolve(dbPath));

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    variante_id TEXT,
    data_inicio TEXT NOT NULL,
    data_fim TEXT,
    operador TEXT,
    estado TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS upload_queue (
    id TEXT PRIMARY KEY,
    caminho_local TEXT NOT NULL,
    estado TEXT NOT NULL,
    tentativas INTEGER DEFAULT 0,
    erro_mensagem TEXT
  );

  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    nivel TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    sessao_id TEXT,
    FOREIGN KEY(sessao_id) REFERENCES sessions(id)
  );
`);

export default db;
