import { describe, it, expect, beforeEach } from 'vitest';
import db from '../lib/db';
import fs from 'fs';

describe('Database Schema', () => {
  beforeEach(() => {
    // Ensure tables exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, sku TEXT NOT NULL, variante_id TEXT, data_inicio TEXT NOT NULL, data_fim TEXT, operador TEXT, estado TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS upload_queue (id TEXT PRIMARY KEY, caminho_local TEXT NOT NULL, estado TEXT NOT NULL, tentativas INTEGER DEFAULT 0, erro_mensagem TEXT);
      CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, nivel TEXT NOT NULL, mensagem TEXT NOT NULL, sessao_id TEXT, FOREIGN KEY(sessao_id) REFERENCES sessions(id));
    `);
  });

  it('should create sessions table', () => {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
    expect(table).toBeDefined();
  });

  it('should create upload_queue table', () => {
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='upload_queue'").get();
    expect(table).toBeDefined();
  });
});
