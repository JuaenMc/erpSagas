import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Products Route Verification', () => {
  it('GET /api/products deve retornar 200 e lista de produtos (não health check)', async () => {
    const res = await request(app).get('/api/products');
    console.log('GET /api/products Response Status:', res.status);
    console.log('GET /api/products Response Body sample:', JSON.stringify(res.body).substring(0, 200));

    expect(res.status).toBe(200);
    // Não pode ser health check!
    expect(res.body.status).not.toBe('ok');
    expect(res.body.db).toBeUndefined();
    // Deve ser o formato do products router
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
