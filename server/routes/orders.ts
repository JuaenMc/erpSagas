import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus, MarketplaceChannel, StockMovementType } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Helper para gerar hash determinístico para cliente Firebase / LGPD
function generateCustomerHash(identifier: string): string {
  return crypto.createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
}

/**
 * Função utilitária para expirar pedidos pendentes há mais de X minutos e liberar o estoque
 */
export async function expirePendingOrders(maxAgeMinutes = 30): Promise<string[]> {
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  const expirationThreshold = maxAgeMinutes === 0 ? new Date(Date.now() + 5000) : new Date(Date.now() - maxAgeMs);

  const expiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: { lte: expirationThreshold },
    },
    select: { id: true, orderNumber: true },
  });

  if (expiredOrders.length === 0) {
    return [];
  }

  const warehouse = await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } }) || await prisma.warehouse.findFirst();
  if (!warehouse) return [];

  const cancelledOrderNumbers: string[] = [];

  for (const ord of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        const fullOrder = await tx.order.findUnique({
          where: { id: ord.id },
          include: { items: true },
        });

        if (fullOrder && fullOrder.status === OrderStatus.PENDING_PAYMENT) {
          for (const item of fullOrder.items) {
            const stockRows: any[] = await tx.$queryRaw`
              SELECT id, "stockPhysical", "stockReservedOrder"
              FROM "WarehouseStock"
              WHERE "warehouseId" = ${warehouse.id} AND "variationId" = ${item.variationId}
              FOR UPDATE
            `;

            if (stockRows && stockRows.length > 0) {
              const st = stockRows[0];
              const newReserved = Math.max(0, Number(st.stockReservedOrder) - item.quantity);

              await tx.warehouseStock.update({
                where: { id: st.id },
                data: { stockReservedOrder: newReserved },
              });

              await tx.stockMovement.create({
                data: {
                  warehouseStockId: st.id,
                  type: StockMovementType.RESERVE_RELEASE,
                  quantity: item.quantity,
                  balanceAfter: Number(st.stockPhysical),
                  referenceDocument: fullOrder.id,
                  notes: `Liberação automática de reserva por expiração de PIX (> ${maxAgeMinutes} min)`,
                },
              });
            }
          }

          await tx.order.update({
            where: { id: ord.id },
            data: { status: OrderStatus.CANCELLED },
          });

          await tx.auditLog.create({
            data: {
              tenantId: fullOrder.tenantId,
              entityName: 'Order',
              entityId: fullOrder.id,
              action: 'AUTO_EXPIRED',
              afterState: { status: OrderStatus.CANCELLED, reason: `Expirado após ${maxAgeMinutes} minutos sem pagamento` },
            },
          });

          cancelledOrderNumbers.push(ord.orderNumber);
        }
      });
    } catch (err: any) {
      console.error(`[expirePendingOrders] Erro ao expirar pedido ${ord.orderNumber}:`, err.message);
    }
  }

  return cancelledOrderNumbers;
}

// C3: Agendamento automático a cada 5 minutos para expirar pedidos pendentes há mais de 30 minutos
const EXPIRE_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  expirePendingOrders(30).catch(err => {
    console.warn('[Auto-Expire Job] Erro na execução periódica:', err.message);
  });
}, EXPIRE_INTERVAL_MS);

/**
 * A1. POST /api/orders
 * Criação transacional de pedido com reserva de estoque (PENDING_PAYMENT) e idempotência
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      externalId,
      channel = 'APP_SAGAS',
      customer,
      items,
      shipping,
      paymentMethod = 'PIX',
      couponCode,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'O pedido deve conter ao menos um item com variationId e quantity.',
      });
    }

    // 1. Idempotência: se externalId foi fornecido e já existe, retornar 200 com pedido existente
    if (externalId && typeof externalId === 'string') {
      const existingOrder = await prisma.order.findFirst({
        where: { externalOrderId: externalId },
        include: {
          items: {
            include: {
              variation: {
                select: { id: true, sku: true, size: true, color: true },
              },
            },
          },
        },
      });

      if (existingOrder) {
        console.log(`[POST /api/orders] Idempotência acionada para externalId=${externalId} (Pedido: ${existingOrder.orderNumber})`);
        return res.status(200).json({
          success: true,
          idempotent: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          status: existingOrder.status,
          totalAmount: Number(existingOrder.grossTotal),
          createdAt: existingOrder.createdAt.toISOString(),
          expiresAt: new Date(existingOrder.createdAt.getTime() + 30 * 60 * 1000).toISOString(),
          message: 'Pedido já existente retornado com sucesso (idempotente).',
        });
      }
    }

    // Identificar tenant principal
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'sagas-moda' } }) || await prisma.tenant.findFirst();
    if (!tenant) {
      return res.status(500).json({ success: false, error: 'TenantError', message: 'Tenant sagas-moda não encontrado.' });
    }

    // Identificar depósito principal
    const warehouse = await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } }) || await prisma.warehouse.findFirst();
    if (!warehouse) {
      return res.status(500).json({ success: false, error: 'WarehouseError', message: 'Depósito principal não encontrado.' });
    }

    // Obter taxas do canal APP_SAGAS para cálculo de margem (M10)
    const channelConfig = await prisma.channelFeeConfig.findFirst({
      where: { channel: MarketplaceChannel.APP_SAGAS, tenantId: tenant.id },
    });

    // 2. Execução da Transação Atômica com Bloqueio de Concorrência
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 2a. Upsert do Cliente (espelhamento Firebase -> Postgres)
      const customerIdentifier = customer?.firebaseUid || customer?.email || customer?.phone || `anon-${Date.now()}`;
      const cpfHash = generateCustomerHash(customerIdentifier);
      const customerName = customer?.name || customer?.fullName || 'Cliente SAGAS';
      const customerEmail = customer?.email || `${customerIdentifier}@app.sagas.moda`;
      const customerPhone = customer?.phone || '11999999999';

      const customerRecord = await tx.customer.upsert({
        where: { cpfHash },
        update: {
          fullName: customerName,
          email: customerEmail,
          phone: customerPhone,
          updatedAt: new Date(),
        },
        create: {
          tenantId: tenant.id,
          fullName: customerName,
          cpfHash,
          cpfEnc: Buffer.from(customerIdentifier).toString('base64'),
          email: customerEmail,
          phone: customerPhone,
          AcquisitionChannel: MarketplaceChannel.APP_SAGAS,
        },
      });

      // 2b. Validação e Bloqueio Concorrente de Estoque (SELECT FOR UPDATE)
      let calculatedGrossTotal = 0;
      let calculatedTotalCmv = 0;
      const orderItemsToCreate: any[] = [];
      const stockUpdates: { stockId: string; newReserved: number; variationId: string; qty: number; currentPhysical: number }[] = [];

      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const requestedVarId = item.variationId;

        // Query com lock de linha para prevenir race conditions estritamente
        const stockRows: any[] = await tx.$queryRaw`
          SELECT id, "stockPhysical", "stockReservedOrder", "stockReservedPromo"
          FROM "WarehouseStock"
          WHERE "warehouseId" = ${warehouse.id} AND "variationId" = ${requestedVarId}
          FOR UPDATE
        `;

        if (!stockRows || stockRows.length === 0) {
          const err: any = new Error(`Item ${requestedVarId} não encontrado no estoque do depósito principal.`);
          err.statusCode = 409;
          err.name = 'InsufficientStockError';
          throw err;
        }

        const stockRow = stockRows[0];
        const physical = Number(stockRow.stockPhysical);
        const reservedOrder = Number(stockRow.stockReservedOrder);
        const reservedPromo = Number(stockRow.stockReservedPromo);
        const available = Math.max(0, physical - reservedOrder - reservedPromo);

        if (available < qty) {
          const err: any = new Error(`Estoque insuficiente para a variação ${requestedVarId}. Disponível: ${available}, Solicitado: ${qty}.`);
          err.statusCode = 409;
          err.name = 'InsufficientStockError';
          throw err;
        }

        // Buscar dados da variação (preço e custo)
        const variation = await tx.productVariation.findUnique({
          where: { id: requestedVarId },
          include: { product: true },
        });

        if (!variation) {
          const err: any = new Error(`Variação ${requestedVarId} não existe.`);
          err.statusCode = 404;
          throw err;
        }

        const unitPrice = item.unitPrice ? Number(item.unitPrice) : Number(variation.priceOverride || variation.product.basePrice);
        const unitCost = Number(variation.costPriceOverride || variation.product.costPrice || 0);

        calculatedGrossTotal += unitPrice * qty;
        calculatedTotalCmv += unitCost * qty;

        stockUpdates.push({
          stockId: stockRow.id,
          newReserved: reservedOrder + qty,
          variationId: requestedVarId,
          qty,
          currentPhysical: physical,
        });

        orderItemsToCreate.push({
          variationId: requestedVarId,
          quantity: qty,
          unitPrice,
          unitCostCmv: unitCost,
        });
      }

      // Adicionar frete ao total
      const shippingCost = Number(shipping?.cost || 0);
      calculatedGrossTotal += shippingCost;

      // 2c. Atualizar estoque reservado (stockReservedOrder += qty)
      for (const update of stockUpdates) {
        await tx.warehouseStock.update({
          where: { id: update.stockId },
          data: { stockReservedOrder: update.newReserved },
        });
      }

      // 2d. Criar Pedido com formato SG-YYYYMMDD-XXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const orderNumber = `SG-${todayStr}-${randomSuffix}`;
      const platformFeeTotal = channelConfig
        ? calculatedGrossTotal * (Number(channelConfig.commissionPct) / 100) +
          calculatedGrossTotal * (Number(channelConfig.paymentFeePct) / 100) +
          Number(channelConfig.packagingCost)
        : 0;

      const newOrder = await tx.order.create({
        data: {
          tenantId: tenant.id,
          orderNumber,
          externalOrderId: externalId || `local-${Date.now()}`,
          channel: MarketplaceChannel.APP_SAGAS,
          status: OrderStatus.PENDING_PAYMENT,
          customerId: customerRecord.id,
          grossTotal: calculatedGrossTotal,
          discountTotal: 0,
          shippingCharged: shippingCost,
          platformFeeTotal,
          netRevenue: calculatedGrossTotal - platformFeeTotal,
          couponCode: couponCode || null,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      // 2e. Criar StockMovement (Auditoria da Reserva)
      for (const update of stockUpdates) {
        await tx.stockMovement.create({
          data: {
            warehouseStockId: update.stockId,
            type: StockMovementType.RESERVE_LOCK,
            quantity: update.qty,
            balanceAfter: update.currentPhysical,
            referenceDocument: newOrder.id,
            notes: `Reserva temporária checkout loja SAGAS (Pedido: ${newOrder.orderNumber}, Canal: APP_SAGAS)`,
          },
        });
      }

      // 2f. Auditoria Imutável (AuditLog)
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          entityName: 'Order',
          entityId: newOrder.id,
          action: 'CREATE',
          afterState: {
            orderNumber: newOrder.orderNumber,
            status: newOrder.status,
            grossTotal: calculatedGrossTotal,
            paymentMethod,
            channel: 'APP_SAGAS',
            itemsCount: items.length,
          },
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'sagas-mobile-store',
        },
      });

      // Calcular margem estimada (M10)
      const netProfit = calculatedGrossTotal - platformFeeTotal - calculatedTotalCmv;
      const estimatedMarginPct = calculatedGrossTotal > 0 ? (netProfit / calculatedGrossTotal) * 100 : 0;

      return {
        order: newOrder,
        estimatedMarginPct: Math.round(estimatedMarginPct * 10) / 10,
      };
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return res.status(201).json({
      success: true,
      orderId: transactionResult.order.id,
      orderNumber: transactionResult.order.orderNumber,
      status: transactionResult.order.status,
      totalAmount: Number(transactionResult.order.grossTotal),
      estimatedMarginPct: transactionResult.estimatedMarginPct,
      expiresAt,
      message: 'Pedido criado com sucesso e estoque reservado.',
    });
  } catch (error: any) {
    if (error.statusCode === 409 || error.name === 'InsufficientStockError') {
      return res.status(409).json({
        success: false,
        error: 'InsufficientStockError',
        message: error.message || 'Estoque insuficiente para completar o pedido.',
      });
    }
    next(error);
  }
});

/**
 * C3. POST /api/orders/expire-pending
 * Rotina para expirar pedidos PENDING_PAYMENT e liberar o estoque reservado
 */
router.post('/expire-pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const maxAgeMinutes = Number(req.body?.maxAgeMinutes ?? req.query?.maxAgeMinutes ?? 30);
    const expiredOrders = await expirePendingOrders(maxAgeMinutes);

    return res.status(200).json({
      success: true,
      expiredCount: expiredOrders.length,
      expiredOrders,
      message: `${expiredOrders.length} pedidos expirados e seus estoques foram liberados.`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * A2. POST /api/orders/:id/payment-confirmed
 * Confirmação de pagamento idempotente via Webhook com baixa definitiva de estoque
 */
router.post('/:id/payment-confirmed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { externalPaymentId, paidAt } = req.body;

    let order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: id },
        include: {
          items: true,
          customer: true,
        },
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Pedido ${id} não encontrado no ERP.`,
      });
    }

    // Idempotência: se já está PAID, retorna 200 sem reprocessar estoque
    if (order.status === OrderStatus.PAID) {
      console.log(`[POST /api/orders/${id}/payment-confirmed] Idempotência: pedido já está PAID.`);
      return res.status(200).json({
        success: true,
        idempotent: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        message: 'Pagamento já havia sido confirmado anteriormente.',
      });
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.status(400).json({
        success: false,
        error: 'InvalidStatusError',
        message: `Não é possível confirmar pagamento para pedido com status: ${order.status}.`,
      });
    }

    const warehouse = await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } }) || await prisma.warehouse.findFirst();
    if (!warehouse) {
      return res.status(500).json({ success: false, error: 'WarehouseError', message: 'Depósito não encontrado.' });
    }

    // Transação de baixa definitiva
    const updatedOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // Bloquear linha de estoque
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

          // Registrar saída definitiva por venda (SALE_OUT)
          await tx.stockMovement.create({
            data: {
              warehouseStockId: st.id,
              type: StockMovementType.SALE_OUT,
              quantity: -item.quantity,
              balanceAfter: newPhysical,
              referenceDocument: order.id,
              notes: `Baixa definitiva por venda confirmada (Pedido: ${order.orderNumber}, Pagamento: ${externalPaymentId || 'Aprovado'})`,
            },
          });
        }
      }

      // Atualizar status do pedido para PAID
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.PAID,
          updatedAt: paidAt ? new Date(paidAt) : new Date(),
        },
      });

      // Atualizar estatísticas do cliente (LTV, contagem de pedidos)
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          ordersCount: { increment: 1 },
          ltvTotal: { increment: order.grossTotal },
          lastPurchaseAt: new Date(),
        },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          entityName: 'Order',
          entityId: order.id,
          action: 'PAYMENT_CONFIRMED',
          beforeState: { status: OrderStatus.PENDING_PAYMENT },
          afterState: { status: OrderStatus.PAID, externalPaymentId },
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'sagas-webhook',
        },
      });

      return updated;
    });

    console.log(`[POST /api/orders/${id}/payment-confirmed] Sucesso! Pedido ${order.orderNumber} marcado como PAID.`);

    return res.status(200).json({
      success: true,
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      message: 'Pagamento confirmado com sucesso e estoque baixado definitivamente.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * A3. POST /api/orders/:id/cancel
 * Cancelamento com liberação de estoque reservado
 */
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelado pelo cliente ou expirado' } = req.body;

    let order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: id },
        include: { items: true },
      });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: `Pedido ${id} não encontrado.` });
    }

    if (order.status === OrderStatus.CANCELLED) {
      return res.status(200).json({
        success: true,
        idempotent: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        message: 'Pedido já se encontra cancelado.',
      });
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.status(400).json({
        success: false,
        error: 'InvalidStatusError',
        message: `Não é possível cancelar pedido com status: ${order.status}. Apenas PENDING_PAYMENT pode ser cancelado diretamente.`,
      });
    }

    const warehouse = await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } }) || await prisma.warehouse.findFirst();
    if (!warehouse) {
      return res.status(500).json({ success: false, error: 'WarehouseError', message: 'Depósito não encontrado.' });
    }

    // Transação de liberação de estoque
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const stockRows: any[] = await tx.$queryRaw`
          SELECT id, "stockPhysical", "stockReservedOrder"
          FROM "WarehouseStock"
          WHERE "warehouseId" = ${warehouse.id} AND "variationId" = ${item.variationId}
          FOR UPDATE
        `;

        if (stockRows && stockRows.length > 0) {
          const st = stockRows[0];
          const newReserved = Math.max(0, Number(st.stockReservedOrder) - item.quantity);

          await tx.warehouseStock.update({
            where: { id: st.id },
            data: { stockReservedOrder: newReserved },
          });

          // Registrar liberação de reserva (RESERVE_RELEASE)
          await tx.stockMovement.create({
            data: {
              warehouseStockId: st.id,
              type: StockMovementType.RESERVE_RELEASE,
              quantity: item.quantity,
              balanceAfter: Number(st.stockPhysical),
              referenceDocument: order.id,
              notes: `Liberação de estoque reservado por cancelamento (Pedido: ${order.orderNumber}, Motivo: ${reason})`,
            },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          entityName: 'Order',
          entityId: order.id,
          action: 'CANCELLED',
          beforeState: { status: OrderStatus.PENDING_PAYMENT },
          afterState: { status: OrderStatus.CANCELLED, reason },
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      orderId: cancelledOrder.id,
      orderNumber: cancelledOrder.orderNumber,
      status: cancelledOrder.status,
      message: 'Pedido cancelado e estoque reservado liberado com sucesso.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * A4. GET /api/orders
 * Listagem de pedidos com filtros (status, channel, customerId, firebaseUid, since)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, channel, customerId, firebaseUid, since, limit = '50', offset = '0' } = req.query;

    const where: any = {};

    if (status && typeof status === 'string') {
      where.status = status as OrderStatus;
    }

    if (channel && typeof channel === 'string') {
      where.channel = channel as MarketplaceChannel;
    }

    if (since && typeof since === 'string') {
      where.createdAt = { gte: new Date(since) };
    }

    if (customerId && typeof customerId === 'string') {
      where.customerId = customerId;
    }

    if (firebaseUid && typeof firebaseUid === 'string') {
      const cpfHash = generateCustomerHash(firebaseUid);
      const cust = await prisma.customer.findFirst({ where: { cpfHash } });
      if (cust) {
        where.customerId = cust.id;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        items: {
          include: {
            variation: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                product: {
                  select: { id: true, title: true, coverImageUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const formatted = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      externalOrderId: o.externalOrderId,
      channel: o.channel,
      status: o.status,
      customerName: o.customer.fullName,
      customerEmail: o.customer.email,
      total: Number(o.grossTotal),
      shipping: Number(o.shippingCharged),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: o.items.map(it => ({
        id: it.id,
        variationId: it.variationId,
        name: it.variation.product.title,
        sku: it.variation.sku,
        size: it.variation.size,
        color: it.variation.color,
        image: it.variation.product.coverImageUrl,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
      })),
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * A5. GET /api/orders/:id
 * Detalhes completos do pedido
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    let order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            variation: {
              include: { product: true },
            },
          },
        },
        packages: true,
      },
    });

    if (!order) {
      order = await prisma.order.findFirst({
        where: { orderNumber: id },
        include: {
          customer: true,
          items: {
            include: {
              variation: {
                include: { product: true },
              },
            },
          },
          packages: true,
        },
      });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: `Pedido ${id} não encontrado.` });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        externalOrderId: order.externalOrderId,
        channel: order.channel,
        status: order.status,
        customer: {
          id: order.customer.id,
          fullName: order.customer.fullName,
          email: order.customer.email,
          phone: order.customer.phone,
        },
        grossTotal: Number(order.grossTotal),
        shippingCharged: Number(order.shippingCharged),
        platformFeeTotal: Number(order.platformFeeTotal),
        netRevenue: Number(order.netRevenue),
        couponCode: order.couponCode,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map(it => ({
          id: it.id,
          variationId: it.variationId,
          name: it.variation.product.title,
          sku: it.variation.sku,
          size: it.variation.size,
          color: it.variation.color,
          image: it.variation.product.coverImageUrl,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          unitCostCmv: Number(it.unitCostCmv),
        })),
        packages: order.packages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * A6. PUT /api/orders/:id/status
 * Atualização direta de status operacional do pedido
 */
router.put('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, trackingCode } = req.body;

    let order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      order = await prisma.order.findFirst({ where: { orderNumber: id } });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: `Pedido ${id} não encontrado.` });
    }

    const previousStatus = order.status;
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        ...(status ? { status: status as OrderStatus } : {}),
        ...(trackingCode ? { trackingCode } : {}),
        ...(status === 'SHIPPED' ? { shippedAt: new Date() } : {}),
        ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: order.tenantId,
        entityName: 'Order',
        entityId: order.id,
        action: 'STATUS_UPDATED',
        beforeState: { status: previousStatus },
        afterState: { status: updated.status, trackingCode },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Status atualizado para ${updated.status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
