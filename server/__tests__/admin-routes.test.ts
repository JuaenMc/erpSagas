import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Admin Panel & Root Integration Tests', () => {
  it('GET / deve retornar 200 e servir o HTML do painel administrativo', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('SAGAS ERP');
    expect(res.text).toContain('Painel Administrativo');
  });

  it('GET /admin-login deve retornar 200 e servir o formulário de login', async () => {
    const res = await request(app).get('/admin-login');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('adminPasswordInput');
  });

  it('GET /api/health deve retornar status ok e timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('POST /api/admin/login com senha errada deve retornar 401', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'senha_invalida_xyz' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/admin/login com senha correta deve autenticar e retornar apiKey', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'sagas2026admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.apiKey).toBeDefined();
    expect(res.body.apiKey).toBe('sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c');
  });
});
