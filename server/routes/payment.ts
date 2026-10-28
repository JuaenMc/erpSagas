import { Router, Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { prisma } from '../db';
import { OrderStatus, StockMovementType } from '@prisma/client';

const router = Router();

function getMercadoPagoClient(customToken?: string): MercadoPagoConfig | null {
  const token = customToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  return new MercadoPagoConfig({
    accessToken: token.trim(),
    options: { timeout: 10000 },
  });
}

/**
 * 1. POST /api/payment/create-preference
 * Criação de preferência do Mercado Pago Checkout Pro
 */
router.post('/create-preference', async (req: Request, res: Response) => {
  try {
    const { items, payer, orderNumber, backUrls, notificationUrl, accessToken } = req.body;

    const client = getMercadoPagoClient(accessToken);
    if (!client) {
      return res.status(400).json({
        success: false,
        error: 'MissingToken',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado no backend.',
      });
    }

    const preference = new Preference(client);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'sagas.moda';
    const baseUrl = `${protocol}://${host}`;

    const formattedItems = (items || []).map((it: any) => ({
      id: String(it.id || it.productId || 'item'),
      title: String(it.title || it.name || 'Produto SAGAS Moda'),
      quantity: Number(it.quantity || 1),
      unit_price: Number(Number(it.price || it.unit_price || 0).toFixed(2)),
      currency_id: 'BRL',
      picture_url: it.picture_url || it.image,
    }));

    const response = await preference.create({
      body: {
        items: formattedItems,
        payer: {
          email: payer?.email || 'cliente@sagas.moda',
          name: payer?.name || payer?.fullName || 'Cliente SAGAS',
        },
        external_reference: String(orderNumber || `SG-${Date.now()}`),
        back_urls: backUrls || {
          success: `${baseUrl}/?status=approved&order=${orderNumber}`,
          pending: `${baseUrl}/?status=pending&order=${orderNumber}`,
          failure: `${baseUrl}/?status=failure&order=${orderNumber}`,
        },
        auto_return: 'approved',
        notification_url: notificationUrl || `${baseUrl}/api/payment/webhook`,
      },
    });

    return res.status(200).json({
      success: true,
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    });
  } catch (error: any) {
    console.error('Erro ao criar Preference Mercado Pago:', error);
    return res.status(500).json({
      success: false,
      error: 'PreferenceCreationError',
      message: error.message || 'Falha ao criar preferência de pagamento.',
    });
  }
});

/**
 * 2. POST /api/payment/create-pix
 * Criação de PIX transparente instantâneo com QR Code dinâmico e Copia-e-Cola
 */
router.post('/create-pix', async (req: Request, res: Response) => {
  try {
    const { amount, description, payer, orderNumber, notificationUrl, accessToken } = req.body;

    const client = getMercadoPagoClient(accessToken);
    if (!client) {
      return res.status(400).json({
        success: false,
        error: 'MissingToken',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
      });
    }

    const payment = new Payment(client);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'sagas.moda';
    const baseUrl = `${protocol}://${host}`;

    const cleanCpf = (payer?.cpf || '19119119100').replace(/\D/g, '');

    const response = await payment.create({
      body: {
        transaction_amount: Number(Number(amount).toFixed(2)),
        description: description || `Pedido ${orderNumber} - SAGAS.MODA`,
        payment_method_id: 'pix',
        external_reference: String(orderNumber),
        payer: {
          email: payer?.email || 'cliente@sagas.moda',
          first_name: payer?.name?.split(' ')[0] || 'Cliente',
          last_name: payer?.name?.split(' ').slice(1).join(' ') || 'SAGAS',
          identification: {
            type: 'CPF',
            number: cleanCpf.length === 11 ? cleanCpf : '19119119100',
          },
        },
        notification_url: notificationUrl || `${baseUrl}/api/payment/webhook`,
      },
    });

    const transactionData = response.point_of_interaction?.transaction_data;

    return res.status(200).json({
      success: true,
      paymentId: response.id,
      status: response.status,
      statusDetail: response.status_detail,
      qrCode: transactionData?.qr_code || '',
      qrCodeBase64: transactionData?.qr_code_base64 || '',
      ticketUrl: transactionData?.ticket_url || '',
    });
  } catch (error: any) {
    console.error('Erro ao gerar Pix Mercado Pago:', error);
    return res.status(500).json({
      success: false,
      error: 'PixCreationError',
      message: error.message || 'Falha ao gerar Pix.',
    });
  }
});

/**
 * 3. POST /api/payment/webhook
 * Webhook IPN oficial do Mercado Pago para confirmação de pagamento e baixa de estoque
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const query = req.query;
    const body = req.body;

    const paymentId = body?.data?.id || query['data.id'] || query.id;
    const topic = query.topic || body?.type || query.type;

    console.log(`[Mercado Pago Webhook] Recebido: paymentId=${paymentId}, topic=${topic}`);

    // Simulação para testes de integração automática
    if (body?.mockApproved && (body?.orderId || body?.external_reference)) {
      const orderRef = body.orderId || body.external_reference;
      await processApprovedPayment(orderRef, String(paymentId || `mock-${Date.now()}`));
      return res.status(200).json({ success: true, message: 'Mock payment processed' });
    }

    if (paymentId && (topic === 'payment' || body?.action?.startsWith('payment.'))) {
      const client = getMercadoPagoClient();
      if (client) {
        const payment = new Payment(client);
        const paymentData = await payment.get({ id: String(paymentId) });

        console.log(`[Mercado Pago Webhook] Status pagamento ${paymentId}: ${paymentData.status} (Pedido: ${paymentData.external_reference})`);

        if (paymentData.status === 'approved') {
          const orderRef = paymentData.external_reference;
          if (orderRef) {
            await processApprovedPayment(orderRef, String(paymentId));
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('Erro no webhook Mercado Pago:', error);
    return res.status(200).send('Webhook recebido');
  }
});

/**
 * Baixa transacional de estoque e atualização de pedido no banco Neon
 */
async function processApprovedPayment(orderRef: string, externalPaymentId: string) {
  try {
    let order = await prisma.order.findUnique({
      where: { id: orderRef },
      include: { items: true },
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: orderRef },
        include: { items: true },
      });
    }

    if (!order) {
      console.warn(`[processApprovedPayment] Pedido ${orderRef} não encontrado no banco.`);
      return;
    }

    if (order.status === OrderStatus.PAID) {
      console.log(`[processApprovedPayment] Pedido ${order.orderNumber} já está como PAID.`);
      return;
    }

    const warehouse = (await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } })) || (await prisma.warehouse.findFirst());
    if (!warehouse) return;

    await prisma.$transaction(async (tx) => {
      // Baixar estoque de cada item do pedido
      for (const item of order!.items) {
        const stockRows: any[] = await tx.$queryRaw`
          SELECT id, "stockPhysical", "stockReservedOrder"
          FROM "WarehouseStock"
          WHERE "warehouseId" = ${warehouse.id} AND "variationId" = ${item.variationId}
          FOR UPDATE
        `;

        if (stockRows && stockRows.length > 0) {
          const st = stockRows[0];
          const newPhysical = Math.max(0, Number(st.stockPhysical) - item.quantity);
          const newReserved = Math.max(0, Number(st.stockReservedOrder) - item.quantity);

          await tx.warehouseStock.update({
            where: { id: st.id },
            data: {
              stockPhysical: newPhysical,
              stockReservedOrder: newReserved,
            },
          });

          await tx.stockMovement.create({
            data: {
              warehouseStockId: st.id,
              type: StockMovementType.SALE_OUT,
              quantity: -item.quantity,
              balanceAfter: newPhysical,
              referenceDocument: order!.id,
              notes: `Baixa automática via Webhook Mercado Pago (ID Pagamento: ${externalPaymentId})`,
            },
          });
        }
      }

      // Atualizar pedido para PAID
      await tx.order.update({
        where: { id: order!.id },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: 'APPROVED',
          paymentId: externalPaymentId,
          paidAt: new Date(),
        },
      });

      // Atualizar estatísticas do cliente
      await tx.customer.update({
        where: { id: order!.customerId },
        data: {
          ordersCount: { increment: 1 },
          ltvTotal: { increment: order!.grossTotal },
          lastPurchaseAt: new Date(),
        },
      });

      // Registrar auditoria
      await tx.auditLog.create({
        data: {
          tenantId: order!.tenantId,
          entityName: 'Order',
          entityId: order!.id,
          action: 'PAYMENT_APPROVED_WEBHOOK',
          afterState: { status: 'PAID', paymentId: externalPaymentId },
        },
      });
    });

    console.log(`[processApprovedPayment] SUCESSO! Pedido ${order.orderNumber} marcado como PAID e estoque baixado.`);
  } catch (err: any) {
    console.error('[processApprovedPayment] Erro ao processar pagamento:', err.message);
  }
}

export default router;
