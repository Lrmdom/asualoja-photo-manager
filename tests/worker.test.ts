import { describe, it, expect } from 'vitest';
import { handleFileAdded } from '../worker/index';
import db from '../lib/db';

describe('Worker', () => {
  it('should add file to upload_queue when detected', () => {
    const filePath = '/test/image.jpg';
    handleFileAdded(filePath);

    const row = db.prepare("SELECT * FROM upload_queue WHERE caminho_local = ?").get(filePath);
    expect(row).toBeDefined();
    expect(row.estado).toBe('Pendente');
  });
});
