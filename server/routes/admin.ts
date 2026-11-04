import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus, StockMovementType } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'sagas_jwt_secret_key_2025_omnichannel';
const ERP_API_KEY = process.env.ERP_INTERNAL_API_KEY || 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';
const ALLOWED_API_KEYS = new Set([
  ERP_API_KEY,
  'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c',
  'sagas_erp_prod_e8d7c6b5a49382710f1e2d3c4b5a69788796a5b4c3d2e1f0123456789abcdef0',
]);

// ============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN (API KEY OU JWT)
// ============================================================================
export function authenticateAdminToken(req: Request, res: Response, next: NextFunction) {
  const providedKey = req.headers['x-api-key'] || req.query.apiKey;
  if (typeof providedKey === 'string' && ALLOWED_API_KEYS.has(providedKey)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (ALLOWED_API_KEYS.has(token)) {
      return next();
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string };
      (req as any).adminUser = decoded;
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        error: 'UnauthorizedError',
        message: 'Token de administrador inválido ou expirado.',
      });
    }
  }

  return res.status(401).json({
    success: false,
    error: 'UnauthorizedError',
    message: 'Acesso restrito a administradores. Credencial ausente.',
  });
}

router.use(authenticateAdminToken);

// ============================================================================
// 1. GET /api/admin/stats - KPIs Financeiros e Operacionais Reais (Prisma Sum/Count)
// ============================================================================
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const validStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.PICKING,
      OrderStatus.CHECKED,
      OrderStatus.PACKED,
      OrderStatus.SHIPPED,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    const [
      paidAgg,
      allNonCancelledAgg,
      totalOrdersCount,
      paidOrdersCount,
      pendingOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      totalProductsCount,
      stockAgg,
      nonCancelledOrdersWithItems,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: validStatuses } },
        _sum: {
          grossTotal: true,
          netRevenue: true,
          platformFeeTotal: true,
          shippingCharged: true,
          discountTotal: true,
        },
      }),
      prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: {
          grossTotal: true,
          netRevenue: true,
          platformFeeTotal: true,
          shippingCharged: true,
        },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: validStatuses } } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
      prisma.order.count({
        where: { status: { in: [OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY] } },
      }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.warehouseStock.aggregate({
        _sum: {
          stockPhysical: true,
          stockReservedOrder: true,
          stockReservedPromo: true,
        },
      }),
      prisma.order.findMany({
        where: { status: { not: OrderStatus.CANCELLED } },
        include: {
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              unitCostCmv: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Faturamento bruto e líquido considerando pedidos ativos (não cancelados)
    const totalRevenue = Number(allNonCancelledAgg._sum.grossTotal || 0);
    const paidRevenue = Number(paidAgg._sum.grossTotal || 0);
    const totalNetRevenue = Number(allNonCancelledAgg._sum.netRevenue || 0);
    const totalPlatformFees = Number(allNonCancelledAgg._sum.platformFeeTotal || 0);

    // Calcular CMV real a partir dos itens dos pedidos
    let totalCmv = 0;
    const channelTotals: Record<string, { gross: number; net: number; fees: number; orders: number }> = {
      APP_SAGAS: { gross: 0, net: 0, fees: 0, orders: 0 },
      SHOPEE: { gross: 0, net: 0, fees: 0, orders: 0 },
      MERCADO_LIVRE: { gross: 0, net: 0, fees: 0, orders: 0 },
      TIKTOK_SHOP: { gross: 0, net: 0, fees: 0, orders: 0 },
    };

    for (const ord of nonCancelledOrdersWithItems) {
      const ch = ord.channel || 'APP_SAGAS';
      if (!channelTotals[ch]) {
        channelTotals[ch] = { gross: 0, net: 0, fees: 0, orders: 0 };
      }
      channelTotals[ch].gross += Number(ord.grossTotal || 0);
      channelTotals[ch].net += Number(ord.netRevenue || 0);
      channelTotals[ch].fees += Number(ord.platformFeeTotal || 0);
      channelTotals[ch].orders += 1;

      for (const it of ord.items) {
        totalCmv += Number(it.unitCostCmv || 0) * Number(it.quantity || 1);
      }
    }

    const activeOrdersCount = totalOrdersCount - cancelledOrdersCount;
    const averageTicket = activeOrdersCount > 0 ? totalRevenue / activeOrdersCount : 0;
    const netProfit = totalNetRevenue - totalCmv;
    const avgMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const totalPhysicalStock = Number(stockAgg._sum.stockPhysical || 0);
    const totalReservedStock =
      Number(stockAgg._sum.stockReservedOrder || 0) + Number(stockAgg._sum.stockReservedPromo || 0);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        paidRevenue: Math.round(paidRevenue * 100) / 100,
        totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        totalCmv: Math.round(totalCmv * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        avgMarginPct: Math.round(avgMarginPct * 10) / 10,
        totalOrdersCount,
        activeOrdersCount,
        paidOrdersCount,
        pendingOrdersCount,
        shippedOrdersCount,
        deliveredOrdersCount,
        cancelledOrdersCount,
        averageTicket: Math.round(averageTicket * 100) / 100,
        totalProductsCount,
        totalPhysicalStock,
        totalReservedStock,
        channelBreakdown: channelTotals,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 2. GET /api/admin/orders - Lista todos os pedidos com clientes e itens
// ============================================================================
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, limit = '100' } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as OrderStatus;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        address: true,
        packages: true,
        items: {
          include: {
            variation: {
              include: {
                product: {
                  select: { id: true, title: true, coverImageUrl: true, masterSku: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      channel: o.channel,
      status: o.status,
      paymentMethod: o.paymentMethod || 'PIX',
      paymentStatus: o.paymentStatus || (o.status === 'PENDING_PAYMENT' ? 'PENDING' : 'APPROVED'),
      trackingCode: o.trackingCode || o.packages?.[0]?.trackingCode || null,
      grossTotal: Number(o.grossTotal),
      discountTotal: Number(o.discountTotal),
      shippingCharged: Number(o.shippingCharged),
      netRevenue: Number(o.netRevenue),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
      deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
      customer: {
        id: o.customer.id,
        fullName: o.customer.fullName,
        email: o.customer.email,
        phone: o.customer.phone,
      },
      address: o.address,
      items: o.items.map((it) => ({
        id: it.id,
        variationId: it.variationId,
        sku: it.variation.sku,
        size: it.variation.size,
        color: it.variation.color,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        unitCostCmv: Number(it.unitCostCmv),
        productTitle: it.variation.product.title,
        productImage: it.variation.product.coverImageUrl,
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

// ============================================================================
// 3. PUT /api/admin/orders/:id/status - Atualizar status e rastreio do pedido
// ============================================================================
router.put('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, trackingCode, carrierName = 'Correios SEDEX' } = req.body;

    let existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true, packages: true },
    });

    if (!existing) {
      existing = await prisma.order.findFirst({
        where: { orderNumber: id },
        include: { items: true, customer: true, packages: true },
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'Pedido não encontrado.',
      });
    }

    const warehouse =
      (await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } })) ||
      (await prisma.warehouse.findFirst());

    const nextStatus = (status as OrderStatus) || existing.status;
    const prevStatus = existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      // Se mudou de PENDING_PAYMENT para PAID/SHIPPED/DELIVERED, baixa o estoque físico e libera a reserva
      if (
        prevStatus === OrderStatus.PENDING_PAYMENT &&
        ['PAID', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(nextStatus) &&
        warehouse
      ) {
        for (const item of existing!.items) {
          const stockRow = await tx.warehouseStock.findFirst({
            where: { warehouseId: warehouse.id, variationId: item.variationId },
          });
          if (stockRow) {
            const newPhysical = Math.max(0, Number(stockRow.stockPhysical) - item.quantity);
            const newReserved = Math.max(0, Number(stockRow.stockReservedOrder) - item.quantity);
            await tx.warehouseStock.update({
              where: { id: stockRow.id },
              data: {
                stockPhysical: newPhysical,
                stockReservedOrder: newReserved,
              },
            });
            await tx.stockMovement.create({
              data: {
                warehouseStockId: stockRow.id,
                type: StockMovementType.SALE_OUT,
                quantity: -item.quantity,
                balanceAfter: newPhysical,
                referenceDocument: existing!.id,
                notes: `Baixa definitiva de estoque via aprovação no ERP Admin (Pedido ${existing!.orderNumber})`,
              },
            });
          }
        }
      }

      // Se mudou para CANCELLED a partir de PENDING_PAYMENT, libera reserva
      if (
        prevStatus === OrderStatus.PENDING_PAYMENT &&
        nextStatus === OrderStatus.CANCELLED &&
        warehouse
      ) {
        for (const item of existing!.items) {
          const stockRow = await tx.warehouseStock.findFirst({
            where: { warehouseId: warehouse.id, variationId: item.variationId },
          });
          if (stockRow) {
            const newReserved = Math.max(0, Number(stockRow.stockReservedOrder) - item.quantity);
            await tx.warehouseStock.update({
              where: { id: stockRow.id },
              data: { stockReservedOrder: newReserved },
            });
            await tx.stockMovement.create({
              data: {
                warehouseStockId: stockRow.id,
                type: StockMovementType.RESERVE_RELEASE,
                quantity: item.quantity,
                balanceAfter: Number(stockRow.stockPhysical),
                referenceDocument: existing!.id,
                notes: `Liberação de reserva por cancelamento no ERP Admin (Pedido ${existing!.orderNumber})`,
              },
            });
          }
        }
      }

      const updateData: any = { status: nextStatus };

      if (trackingCode !== undefined) {
        updateData.trackingCode = trackingCode;
      }

      if (nextStatus === OrderStatus.PAID && !existing!.paidAt) {
        updateData.paidAt = new Date();
        updateData.paymentStatus = 'APPROVED';
      } else if (nextStatus === OrderStatus.SHIPPED && !existing!.shippedAt) {
        updateData.shippedAt = new Date();
      } else if (nextStatus === OrderStatus.DELIVERED && !existing!.deliveredAt) {
        updateData.deliveredAt = new Date();
      } else if (nextStatus === OrderStatus.CANCELLED && !existing!.cancelledAt) {
        updateData.cancelledAt = new Date();
        updateData.paymentStatus = 'CANCELLED';
      }

      const ord = await tx.order.update({
        where: { id: existing!.id },
        data: updateData,
      });

      // Atualizar ou criar pacote de rastreio se trackingCode foi fornecido
      const resolvedTracking = trackingCode || ord.trackingCode;
      if (resolvedTracking) {
        const pkgStatus =
          nextStatus === OrderStatus.DELIVERED
            ? 'DELIVERED'
            : nextStatus === OrderStatus.SHIPPED
            ? 'IN_TRANSIT'
            : 'POSTED';

        if (existing!.packages && existing!.packages.length > 0) {
          await tx.shipmentPackage.update({
            where: { id: existing!.packages[0].id },
            data: {
              trackingCode: resolvedTracking,
              carrierName,
              currentStatus: pkgStatus,
              ...(nextStatus === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
            },
          });
        } else {
          await tx.shipmentPackage.create({
            data: {
              orderId: ord.id,
              carrierName,
              trackingCode: resolvedTracking,
              packageIndex: 1,
              currentStatus: pkgStatus,
              eventsJson: [
                {
                  timestamp: new Date().toISOString(),
                  location: 'CD Principal SAGAS - São Paulo/SP',
                  description: `Status atualizado para ${nextStatus} (${resolvedTracking})`,
                  notifiedCustomer: true,
                },
              ],
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: existing!.tenantId,
          entityName: 'Order',
          entityId: ord.id,
          action: 'ADMIN_ORDER_STATUS_UPDATE',
          beforeState: { status: prevStatus, trackingCode: existing!.trackingCode },
          afterState: { status: ord.status, trackingCode: ord.trackingCode },
        },
      });

      return ord;
    });

    // Estrutura preparada para Webhook / E-mail Transacional ao Cliente (Fase 2)
    console.log(
      `[Customer Notification Webhook Ready] Pedido ${updated.orderNumber} (${existing.customer.email}): Status=${updated.status}, Rastreio=${updated.trackingCode || 'N/A'}`
    );

    return res.status(200).json({
      success: true,
      message: `Pedido ${updated.orderNumber} atualizado para ${updated.status}.`,
      data: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        trackingCode: updated.trackingCode,
        paidAt: updated.paidAt,
        shippedAt: updated.shippedAt,
        deliveredAt: updated.deliveredAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 4. GET /api/admin/customers - Lista todos os clientes cadastrados
// ============================================================================
router.get('/customers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { orders: true, addresses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      ordersCount: c._count.orders || c.ordersCount,
      addressesCount: c._count.addresses,
      ltvTotal: Number(c.ltvTotal),
      lastPurchaseAt: c.lastPurchaseAt ? c.lastPurchaseAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
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

// ============================================================================
// 5. GET /api/admin/reports - Relatório de vendas por período e produtos mais vendidos
// ============================================================================
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = Math.max(1, Math.min(365, Number(days) || 30));
    const sinceDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sinceDate },
        status: { not: OrderStatus.CANCELLED },
      },
      include: {
        items: {
          include: {
            variation: {
              include: {
                product: {
                  select: { id: true, title: true, masterSku: true, coverImageUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupar vendas por dia
    const salesByDayMap: Record<
      string,
      {
        date: string;
        revenue: number;
        netRevenue: number;
        platformFees: number;
        cmv: number;
        orders: number;
        appSales: number;
        shopeeSales: number;
        mlSales: number;
        tiktokSales: number;
      }
    > = {};
    // Agrupar top produtos
    const productSalesMap: Record<
      string,
      {
        productId: string;
        title: string;
        masterSku: string;
        quantitySold: number;
        revenue: number;
        cmv: number;
      }
    > = {};

    for (const o of orders) {
      const dayKey = o.createdAt.toISOString().slice(0, 10);
      if (!salesByDayMap[dayKey]) {
        salesByDayMap[dayKey] = {
          date: dayKey,
          revenue: 0,
          netRevenue: 0,
          platformFees: 0,
          cmv: 0,
          orders: 0,
          appSales: 0,
          shopeeSales: 0,
          mlSales: 0,
          tiktokSales: 0,
        };
      }
      const gross = Number(o.grossTotal);
      const net = Number(o.netRevenue);
      const fees = Number(o.platformFeeTotal);

      salesByDayMap[dayKey].revenue += gross;
      salesByDayMap[dayKey].netRevenue += net;
      salesByDayMap[dayKey].platformFees += fees;
      salesByDayMap[dayKey].orders += 1;

      if (o.channel === 'SHOPEE') salesByDayMap[dayKey].shopeeSales += gross;
      else if (o.channel === 'MERCADO_LIVRE') salesByDayMap[dayKey].mlSales += gross;
      else if (o.channel === 'TIKTOK_SHOP') salesByDayMap[dayKey].tiktokSales += gross;
      else salesByDayMap[dayKey].appSales += gross;

      for (const it of o.items) {
        const prod = it.variation.product;
        const itemCmv = Number(it.unitCostCmv || 0) * it.quantity;
        salesByDayMap[dayKey].cmv += itemCmv;

        if (!productSalesMap[prod.id]) {
          productSalesMap[prod.id] = {
            productId: prod.id,
            title: prod.title,
            masterSku: prod.masterSku,
            quantitySold: 0,
            revenue: 0,
            cmv: 0,
          };
        }
        productSalesMap[prod.id].quantitySold += it.quantity;
        productSalesMap[prod.id].revenue += Number(it.unitPrice) * it.quantity;
        productSalesMap[prod.id].cmv += itemCmv;
      }
    }

    const salesByDay = Object.values(salesByDayMap);
    const topProducts = Object.values(productSalesMap)
      .map((p) => ({
        ...p,
        marginPct:
          p.revenue > 0 ? Math.round(((p.revenue - p.cmv) / p.revenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        periodDays: daysNum,
        salesByDay,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
