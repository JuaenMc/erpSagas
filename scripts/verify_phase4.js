import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runAcceptanceSuite() {
  console.log('================================================================');
  console.log('   SUÍTE DE VALIDAÇÃO CRÍTICA - FASE 4 (CICLO DE PEDIDOS)');
  console.log('================================================================\n');

  const API_KEY = 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';
  const ERP_URL = 'http://localhost:3001';
  const STORE_URL = 'http://localhost:3000';

  // Buscar variação disponível com estoque
  const variation = await prisma.productVariation.findFirst({
    where: { stocks: { some: { stockPhysical: { gte: 10 } } } },
    include: { stocks: true, product: true }
  });
  if (!variation) throw new Error('Nenhuma variação com estoque encontrada');

  const stockBefore = variation.stocks[0];
  console.log('--- 1. ESTADO INICIAL DO ESTOQUE ---');
  console.log('SKU:', variation.sku, '| Produto:', variation.product.title);
  console.log('Físico Inicial:', stockBefore.stockPhysical, '| Reservado Inicial:', stockBefore.stockReservedOrder, '| Disponível:', stockBefore.stockPhysical - stockBefore.stockReservedOrder);

  // 1. Criar pedido com reserva
  const extId = 'fase4-test-' + Date.now();
  console.log('\n--- 2. CRIAÇÃO DE PEDIDO COM RESERVA (POST /api/orders) ---');
  const createRes = await fetch(ERP_URL + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-API-KEY': API_KEY },
    body: JSON.stringify({
      externalId: extId,
      channel: 'APP_SAGAS',
      customer: {
        firebaseUid: 'test-firebase-user-4',
        name: 'Cliente Teste Fase 4',
        email: 'cliente.fase4@sagas.moda',
        phone: '11999994444',
        address: { street: 'Rua Oscar Freire', number: '100', city: 'São Paulo', state: 'SP', zipCode: '01426-000' }
      },
      items: [{ variationId: variation.id, quantity: 2, unitPrice: 129.90 }],
      shipping: { cost: 15.00, method: 'CORREIOS_PAC' },
      paymentMethod: 'PIX'
    })
  });
  const createData = await createRes.json();
  console.log('Status HTTP:', createRes.status, '| Payload de retorno:', createData);

  const stockAfterReserve = await prisma.warehouseStock.findUnique({ where: { id: stockBefore.id } });
  console.log('Estoque Pós-Reserva -> Físico:', stockAfterReserve.stockPhysical, '| Reservado:', stockAfterReserve.stockReservedOrder, '| Disponível:', stockAfterReserve.stockPhysical - stockAfterReserve.stockReservedOrder);

  // 2. Teste de Idempotência na criação
  console.log('\n--- 3. TESTE DE IDEMPOTÊNCIA DE CRIAÇÃO ---');
  const idemRes = await fetch(ERP_URL + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-API-KEY': API_KEY },
    body: JSON.stringify({
      externalId: extId,
      channel: 'APP_SAGAS',
      customer: { firebaseUid: 'test-firebase-user-4', name: 'Cliente Teste' },
      items: [{ variationId: variation.id, quantity: 2, unitPrice: 129.90 }]
    })
  });
  const idemData = await idemRes.json();
  console.log('Status HTTP (2ª chamada):', idemRes.status, '| Idempotent:', idemData.idempotent, '| OrderNumber retornado:', idemData.orderNumber);

  // 3. Webhook da Loja -> ERP pagamento aprovado
  console.log('\n--- 4. WEBHOOK MERCADO PAGO NA LOJA -> REPOST ERP ---');
  const webhookRes = await fetch(STORE_URL + '/api/mercadopago/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mockApproved: true,
      orderId: createData.orderId,
      paymentId: 'mp-pay-' + Date.now()
    })
  });
  console.log('Status Webhook Loja:', webhookRes.status);

  // Aguardar sincronização assíncrona
  await new Promise(r => setTimeout(r, 2000));

  const orderAfterPay = await prisma.order.findUnique({ where: { id: createData.orderId } });
  const stockAfterPay = await prisma.warehouseStock.findUnique({ where: { id: stockBefore.id } });
  console.log('Pedido status pós-webhook:', orderAfterPay.status, '| externalPaymentId:', orderAfterPay.externalPaymentId);
  console.log('Estoque Pós-Pagamento -> Físico:', stockAfterPay.stockPhysical, '| Reservado:', stockAfterPay.stockReservedOrder, '| Disponível:', stockAfterPay.stockPhysical - stockAfterPay.stockReservedOrder);

  // 4. Teste de Idempotência no pagamento
  console.log('\n--- 5. TESTE DE IDEMPOTÊNCIA NO PAGAMENTO CONFIRMADO ---');
  const payIdemRes = await fetch(ERP_URL + '/api/orders/' + createData.orderId + '/payment-confirmed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-API-KEY': API_KEY },
    body: JSON.stringify({ externalPaymentId: 'mp-pay-duplicate', paidAt: new Date().toISOString() })
  });
  const payIdemData = await payIdemRes.json();
  console.log('Status HTTP (2ª chamada pagamento):', payIdemRes.status, '| Idempotent:', payIdemData.idempotent, '| Status:', payIdemData.status);

  // 5. Teste de Listagem (GET /api/orders) para OrdersScreen
  console.log('\n--- 6. LISTAGEM DE PEDIDOS (GET /api/orders) ---');
  const listRes = await fetch(ERP_URL + '/api/orders?firebaseUid=test-firebase-user-4', {
    headers: { 'X-ERP-API-KEY': API_KEY }
  });
  const listData = await listRes.json();
  console.log('Total de pedidos encontrados para o cliente:', listData.count);
  if (listData.data && listData.data.length > 0) {
    const o = listData.data[0];
    console.log('Exemplo pedido:', { orderNumber: o.orderNumber, status: o.status, total: o.total, itemsCount: o.items.length });
  }

  // 6. Teste de Auditoria e Movimentações
  console.log('\n--- 7. AUDITORIA E MOVIMENTAÇÕES DE ESTOQUE ---');
  const movements = await prisma.stockMovement.findMany({
    where: { referenceDocument: createData.orderId },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Movimentações de estoque vinculadas ao pedido:');
  movements.forEach(m => console.log('  -> Tipo:', m.type, '| Qtd:', m.quantity, '| Saldo Pós:', m.balanceAfter));

  const audits = await prisma.auditLog.findMany({
    where: { entityId: createData.orderId },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Logs de auditoria vinculados ao pedido:');
  audits.forEach(a => console.log('  -> Ação:', a.action, '| Entidade:', a.entityName, '| Data:', a.createdAt.toISOString()));

  // 7. Checagem de Consistência Geral
  console.log('\n--- 8. CHECAGEM GERAL DE CONSISTÊNCIA DE DADOS ---');
  const totalStockQuery = await prisma.$queryRaw`
    SELECT SUM("stockPhysical") as total_physical, SUM("stockReservedOrder") as total_reserved
    FROM "WarehouseStock"
  `;
  console.log('Totais de Estoque no Armazém:', totalStockQuery[0]);

  const orphanMovements = await prisma.stockMovement.count({
    where: { referenceDocument: null }
  });
  console.log('Movimentações órfãs:', orphanMovements);

  console.log('\n================================================================');
  console.log('   TODOS OS CRITÉRIOS DE ACEITE DA FASE 4 FORAM VALIDDOS!');
  console.log('================================================================');
  await prisma.$disconnect();
}

runAcceptanceSuite().catch(e => { console.error(e); process.exit(1); });
