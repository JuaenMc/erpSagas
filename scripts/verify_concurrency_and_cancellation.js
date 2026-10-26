import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runConcurrencyAndCancellation() {
  console.log('================================================================');
  console.log('   TESTES CRÍTICOS: CONCORRÊNCIA (C1) & CANCELAMENTO (C3/C4)');
  console.log('================================================================\n');

  const API_KEY = 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';
  const ERP_URL = 'http://localhost:3001';

  // Buscar uma variação ou criar uma dedicada com stockPhysical = 1
  const product = await prisma.product.findFirst();
  const testVar = await prisma.productVariation.create({
    data: {
      productId: product.id,
      sku: 'TEST-RACE-' + Date.now(),
      barcodeEan13: '789' + String(Date.now()).slice(-10),
      size: 'G',
      color: 'Preto Race',
    }
  });

  const warehouse = await prisma.warehouse.findFirst();
  await prisma.warehouseStock.create({
    data: {
      warehouseId: warehouse.id,
      variationId: testVar.id,
      stockPhysical: 1,
      stockReservedOrder: 0,
    }
  });

  console.log(`[C1] Variação criada para teste de concorrência: SKU=${testVar.sku}, Estoque Físico=1, Reservado=0`);

  // Disparar 2 requisições concorrentes simultâneas (Promise.all)
  const req1 = fetch(ERP_URL + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-API-KEY': API_KEY },
    body: JSON.stringify({
      externalId: 'race-client-A-' + Date.now(),
      channel: 'APP_SAGAS',
      customer: { firebaseUid: 'client-A', name: 'Cliente A Concorrente' },
      items: [{ variationId: testVar.id, quantity: 1, unitPrice: 99.90 }]
    })
  });

  const req2 = fetch(ERP_URL + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-API-KEY': API_KEY },
    body: JSON.stringify({
      externalId: 'race-client-B-' + Date.now(),
      channel: 'APP_SAGAS',
      customer: { firebaseUid: 'client-B', name: 'Cliente B Concorrente' },
      items: [{ variationId: testVar.id, quantity: 1, unitPrice: 99.90 }]
    })
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

  console.log('\n[C1] Resultado da Requisição 1: HTTP', res1.status, data1);
  console.log('[C1] Resultado da Requisição 2: HTTP', res2.status, data2);

  const statuses = [res1.status, res2.status].sort();
  if (statuses[0] === 201 && statuses[1] === 409) {
    console.log('✅ C1 CONCORRÊNCIA VALIDADA: Exatamente UMA requisição obteve 201 (Sucesso) e a outra recebeu 409 Conflict (Estoque Insuficiente)!');
  } else {
    console.error('❌ Falha na validação de concorrência:', statuses);
  }

  // Obter o pedido que teve sucesso para testar cancelamento/expiração
  const winningOrderId = data1.orderId || data2.orderId;
  const stockDuringHold = await prisma.warehouseStock.findFirst({ where: { variationId: testVar.id } });
  console.log('\n[C3/C4] Estoque retido pelo pedido vencedor:', {
    orderId: winningOrderId,
    stockPhysical: stockDuringHold.stockPhysical,
    stockReservedOrder: stockDuringHold.stockReservedOrder,
    disponivel: stockDuringHold.stockPhysical - stockDuringHold.stockReservedOrder
  });

  // Executar cancelamento/expiração
  console.log('\n[C3/C4] Executando cancelamento do pedido retido (POST /api/orders/:id/cancel)...');
  const cancelRes = await fetch(ERP_URL + '/api/orders/' + winningOrderId + '/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ERP-API-KEY': API_KEY },
    body: JSON.stringify({ reason: 'PIX expirado após 30min de inatividade' })
  });
  const cancelData = await cancelRes.json();
  console.log('Status HTTP Cancelamento:', cancelRes.status, cancelData);

  const stockAfterCancel = await prisma.warehouseStock.findFirst({ where: { variationId: testVar.id } });
  console.log('Estoque liberado pós-cancelamento:', {
    stockPhysical: stockAfterCancel.stockPhysical,
    stockReservedOrder: stockAfterCancel.stockReservedOrder,
    disponivel: stockAfterCancel.stockPhysical - stockAfterCancel.stockReservedOrder
  });

  const cancelMovement = await prisma.stockMovement.findFirst({
    where: { referenceDocument: winningOrderId, type: 'RESERVE_RELEASE' }
  });
  console.log('Movimentação de liberação gerada no banco:', {
    type: cancelMovement?.type,
    quantity: cancelMovement?.quantity,
    referenceDocument: cancelMovement?.referenceDocument
  });

  if (stockAfterCancel.stockReservedOrder === 0 && cancelMovement) {
    console.log('✅ C3/C4 CANCELAMENTO E LIBERAÇÃO DE ESTOQUE VALIDADOS COM SUCESSO!');
  }

  await prisma.$disconnect();
}

runConcurrencyAndCancellation().catch(console.error);
