import { describe, it, expect } from 'vitest';
import db from '../lib/db';

describe('Session Management', () => {
  it('should start a session', () => {
    const sessionId = 'test-session';
    db.prepare("INSERT INTO sessions (id, sku, data_inicio, estado) VALUES (?, ?, ?, ?)").run(
      sessionId, 'SKU123', new Date().toISOString(), 'Ativa'
    );
    
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
    expect(session).toBeDefined();
    expect(session.sku).toBe('SKU123');
  });
});
