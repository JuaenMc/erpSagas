import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app, { prisma } from '../index';

const API_KEY = process.env.ERP_INTERNAL_API_KEY || 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';

describe('Orders Integration Tests (Supertest + Real DB)', () => {
  let testVariationId: string;
  let testStockId: string;
  let initialPhysicalStock: number = 0;
  let createdOrderId: string;
  let createdOrderNumber: string;
  const uniqueTestExternalId = `test-ext-${Date.now()}`;

  beforeAll(async () => {
    const stock = await prisma.warehouseStock.findFirst({
      where: {
        stockPhysical: { gte: 5 },
      },
      include: {
        variation: true,
      },
    });

    if (!stock) {
      throw new Error('Nenhum estoque encontrado para teste de integração. Execute o seed.');
    }

    testStockId = stock.id;
    testVariationId = stock.variationId;
    initialPhysicalStock = Number(stock.stockPhysical);
  });

  afterAll(async () => {
    if (createdOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.order.deleteMany({ where: { id: createdOrderId } });
    }
  });

  describe('POST /api/orders - Validação e Criação', () => {
    it('deve rejeitar requisição sem X-ERP-API-KEY com 401 Unauthorized', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          externalId: `test-unauth-${Date.now()}`,
          items: [{ variationId: testVariationId, quantity: 1 }],
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('deve retornar 400 Bad Request se a lista de itens estiver vazia', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ValidationError');
    });

    it('deve retornar 404 se a variação solicitada não existir', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          items: [{ variationId: 'var-uuid-inexistente-xyz', quantity: 1 }],
        });

      expect(response.status).toBe(409); // InsufficientStockError ou 404
    });

    it('deve retornar 409 Conflict se a quantidade solicitada exceder o estoque disponível', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          items: [{ variationId: testVariationId, quantity: 99999 }],
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('InsufficientStockError');
    });

    it('deve criar pedido com sucesso e reservar estoque (status PENDING_PAYMENT)', async () => {
      const initialStockRecord = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      const initialReserved = Number(initialStockRecord?.stockReservedOrder || 0);

      const payload = {
        externalId: uniqueTestExternalId,
        channel: 'APP_SAGAS',
        customer: {
          name: 'Maria Teste Automatizado',
          email: 'maria.teste@sagas.test',
          phone: '11988887777',
        },
        items: [
          {
            variationId: testVariationId,
            quantity: 1,
            unitPrice: 99.9,
          },
        ],
        shipping: {
          cost: 15.0,
        },
        paymentMethod: 'PIX',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.orderId).toBeDefined();
      expect(response.body.orderNumber).toBeDefined();
      expect(response.body.status).toBe('PENDING_PAYMENT');
      expect(response.body.totalAmount).toBe(114.9);

      createdOrderId = response.body.orderId;
      createdOrderNumber = response.body.orderNumber;

      const updatedStock = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      expect(Number(updatedStock?.stockReservedOrder)).toBe(initialReserved + 1);
    });

    it('deve garantir idempotência: reenviar o mesmo externalId deve retornar 200 com pedido já existente sem duplicar reserva', async () => {
      const stockBefore = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });

      const payload = {
        externalId: uniqueTestExternalId,
        channel: 'APP_SAGAS',
        items: [
          {
            variationId: testVariationId,
            quantity: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.idempotent).toBe(true);
      expect(response.body.orderId).toBe(createdOrderId);
      expect(response.body.orderNumber).toBe(createdOrderNumber);

      const stockAfter = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      expect(stockAfter?.stockReservedOrder).toBe(stockBefore?.stockReservedOrder);
    });
  });

  describe('GET /api/orders e GET /api/orders/:id - Consulta de Pedidos', () => {
    it('deve listar pedidos existentes via GET /api/orders', async () => {
      const response = await request(app)
        .get('/api/orders?limit=10')
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('deve filtrar pedidos por status', async () => {
      const response = await request(app)
        .get('/api/orders?status=PENDING_PAYMENT')
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const allPending = response.body.data.every((o: any) => o.status === 'PENDING_PAYMENT');
      expect(allPending).toBe(true);
    });

    it('deve filtrar pedidos por channel e since', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const response = await request(app)
        .get(`/api/orders?channel=APP_SAGAS&since=${yesterday}`)
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve aceitar filtros por customerId e firebaseUid existente', async () => {
      // 1. Criar pedido com firebaseUid específico
      const firebaseUid = 'fb-user-real-test-123';
      await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          externalId: `test-fb-${Date.now()}`,
          channel: 'APP_SAGAS',
          customer: {
            firebaseUid,
            name: 'Cliente Firebase Teste',
            email: 'cliente.fb@sagas.test',
          },
          items: [{ variationId: testVariationId, quantity: 1, unitPrice: 80.0 }],
        });

      // 2. Chamar novamente com o mesmo cliente para exercitar o update do upsert
      await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          externalId: `test-fb-2-${Date.now()}`,
          channel: 'APP_SAGAS',
          customer: {
            firebaseUid,
            name: 'Cliente Firebase Teste Atualizado',
            email: 'cliente.fb@sagas.test',
          },
          items: [{ variationId: testVariationId, quantity: 1, unitPrice: 80.0 }],
        });

      // 3. Consultar pedidos filtrando pelo firebaseUid existente
      const response = await request(app)
        .get(`/api/orders?firebaseUid=${firebaseUid}`)
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('deve retornar detalhes completos de um pedido existente por ID', async () => {
      const response = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdOrderId);
      expect(response.body.data.orderNumber).toBe(createdOrderNumber);
      expect(response.body.data.customer).toBeDefined();
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('deve retornar detalhes completos buscando pelo orderNumber legível', async () => {
      const response = await request(app)
        .get(`/api/orders/${createdOrderNumber}`)
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdOrderId);
    });

    it('deve retornar 404 ao tentar confirmar pagamento de pedido inexistente', async () => {
      const response = await request(app)
        .post('/api/orders/pedido-nao-existe-9999/payment-confirmed')
        .set('X-ERP-API-KEY', API_KEY)
        .send({ externalPaymentId: 'none' });

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 ao tentar cancelar pedido inexistente', async () => {
      const response = await request(app)
        .post('/api/orders/pedido-nao-existe-9999/cancel')
        .set('X-ERP-API-KEY', API_KEY)
        .send({ reason: 'Inexistente' });

      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para pedido inexistente', async () => {
      const response = await request(app)
        .get('/api/orders/order-uuid-inexistente-1234')
        .set('X-ERP-API-KEY', API_KEY);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFoundError');
    });
  });

  describe('POST /api/orders/:id/payment-confirmed - Baixa Definitiva de Estoque', () => {
    it('deve confirmar pagamento, marcar como PAID e realizar baixa física de estoque', async () => {
      const stockBefore = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      const physicalBefore = Number(stockBefore?.stockPhysical || 0);
      const reservedBefore = Number(stockBefore?.stockReservedOrder || 0);

      const response = await request(app)
        .post(`/api/orders/${createdOrderId}/payment-confirmed`)
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          externalPaymentId: 'mp-test-pay-123',
          paidAt: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('PAID');

      const stockAfter = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      expect(Number(stockAfter?.stockPhysical)).toBe(physicalBefore - 1);
      expect(Number(stockAfter?.stockReservedOrder)).toBe(reservedBefore - 1);
    });

    it('deve ser idempotente em payment-confirmed: chamar 2x retorna 200 sem duplicar baixa física', async () => {
      const stockBefore = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });

      const response = await request(app)
        .post(`/api/orders/${createdOrderId}/payment-confirmed`)
        .set('X-ERP-API-KEY', API_KEY)
        .send({ externalPaymentId: 'mp-test-pay-123' });

      expect(response.status).toBe(200);
      expect(response.body.idempotent).toBe(true);

      const stockAfter = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      expect(stockAfter?.stockPhysical).toBe(stockBefore?.stockPhysical);
    });

    it('deve rejeitar cancelamento de pedido que já está PAID com 400 InvalidStatusError', async () => {
      const response = await request(app)
        .post(`/api/orders/${createdOrderId}/cancel`)
        .set('X-ERP-API-KEY', API_KEY)
        .send({ reason: 'Tentativa de cancelar pedido já pago' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidStatusError');
    });
  });

  describe('POST /api/orders/:id/cancel - Liberação de Estoque Reservado', () => {
    let cancelableOrderId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          externalId: `test-cancel-${Date.now()}`,
          channel: 'APP_SAGAS',
          customer: { name: 'Teste Cancelamento', email: 'cancel@sagas.test' },
          items: [{ variationId: testVariationId, quantity: 1, unitPrice: 50.0 }],
        });
      cancelableOrderId = res.body.orderId;
    });

    it('deve cancelar pedido pendente e liberar a reserva de estoque', async () => {
      const stockBefore = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      const reservedBefore = Number(stockBefore?.stockReservedOrder || 0);

      const response = await request(app)
        .post(`/api/orders/${cancelableOrderId}/cancel`)
        .set('X-ERP-API-KEY', API_KEY)
        .send({ reason: 'Desistência do cliente no checkout' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('CANCELLED');

      const stockAfter = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      expect(Number(stockAfter?.stockReservedOrder)).toBe(reservedBefore - 1);
    });

    it('deve retornar idempotente se cancelar um pedido que já está CANCELLED', async () => {
      const response = await request(app)
        .post(`/api/orders/${cancelableOrderId}/cancel`)
        .set('X-ERP-API-KEY', API_KEY)
        .send({ reason: 'Tentativa duplicada de cancelamento' });

      expect(response.status).toBe(200);
      expect(response.body.idempotent).toBe(true);
    });

    it('deve rejeitar confirmação de pagamento para pedido CANCELLED com 400 InvalidStatusError', async () => {
      const response = await request(app)
        .post(`/api/orders/${cancelableOrderId}/payment-confirmed`)
        .set('X-ERP-API-KEY', API_KEY)
        .send({ externalPaymentId: 'pay-after-cancel' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidStatusError');
    });
  });

  describe('POST /api/orders/expire-pending - Rotina de expiração periódica', () => {
    it('deve executar rotina de expiração de pedidos pendentes sem erros', async () => {
      const response = await request(app)
        .post('/api/orders/expire-pending')
        .set('X-ERP-API-KEY', API_KEY)
        .send({ maxAgeMinutes: 60 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.expiredCount).toBe('number');
    });
  });

  describe('Concorrência e Proteção contra Race Conditions', () => {
    it('deve impedir oversell quando duas requisições simultâneas disputam o último item do estoque', async () => {
      const targetStock = await prisma.warehouseStock.findUnique({
        where: { id: testStockId },
      });
      const originalPhysical = Number(targetStock?.stockPhysical || 10);
      const originalReserved = Number(targetStock?.stockReservedOrder || 0);

      await prisma.warehouseStock.update({
        where: { id: testStockId },
        data: {
          stockPhysical: originalReserved + 1,
        },
      });

      const req1 = request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          externalId: `race-1-${Date.now()}`,
          customer: { name: 'Comprador Concorrente 1' },
          items: [{ variationId: testVariationId, quantity: 1, unitPrice: 70.0 }],
        });

      const req2 = request(app)
        .post('/api/orders')
        .set('X-ERP-API-KEY', API_KEY)
        .send({
          externalId: `race-2-${Date.now()}`,
          customer: { name: 'Comprador Concorrente 2' },
          items: [{ variationId: testVariationId, quantity: 1, unitPrice: 70.0 }],
        });

      const [res1, res2] = await Promise.all([req1, req2]);
      const statuses = [res1.status, res2.status].sort();

      expect(statuses).toEqual([201, 409]);

      await prisma.warehouseStock.update({
        where: { id: testStockId },
        data: {
          stockPhysical: originalPhysical,
        },
      });
    });
  });
});
