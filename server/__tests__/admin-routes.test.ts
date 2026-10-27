import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Admin Panel, Auth & Cookie Integration Tests', () => {
  let authCookie: string;

  it('GET / deve retornar 200 e servir o HTML do painel administrativo', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('SAGAS ERP');
    expect(res.text).toContain('Painel Administrativo');
  });

  it('GET /admin-login deve retornar 200 e servir a tela de login', async () => {
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
      .send({ password: 'senha_incorreta' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/admin/login com senha correta deve autenticar e retornar cookie httpOnly', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'sagas2026admin' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.apiKey).toBeDefined();

    // Validar Cookie httpOnly
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    expect(cookieHeader).toContain('sagas_admin_token=');
    expect(cookieHeader.toLowerCase()).toContain('httponly');

    authCookie = cookieHeader;
  });

  it('GET /api/admin/verify com cookie httpOnly deve retornar 200', async () => {
    const res = await request(app)
      .get('/api/admin/verify')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
  });

  it('GET /api/admin/stats com cookie deve retornar estatísticas consolidadas', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totalProducts).toBeTypeOf('number');
    expect(res.body.data.totalRevenue).toBeTypeOf('number');
  });

  it('POST /api/admin/logout deve limpar o cookie', async () => {
    const res = await request(app)
      .post('/api/admin/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    expect(cookieStr).toContain('sagas_admin_token=;');
  });
});
