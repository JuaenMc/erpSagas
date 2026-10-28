import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { OrderStatus, StockMovementType } from '@prisma/client';

const router = Router();

/**
 * GET /api/admin/stats
 * Indicadores reais de vendas, pedidos e clientes diretamente do Neon DB
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [ordersCount, paidOrders, customersCount, productsCount, criticalStockCount] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        where: { status: OrderStatus.PAID },
        select: { grossTotal: true, netRevenue: true, platformFeeTotal: true, createdAt: true },
      }),
      prisma.customer.count(),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.warehouseStock.count({
        where: {
          stockPhysical: { lte: 5 },
        },
      }),
    ]);

    const totalRevenue = paidOrders.reduce((acc, o) => acc + Number(o.grossTotal), 0);
    const totalNetRevenue = paidOrders.reduce((acc, o) => acc + Number(o.netRevenue), 0);
    const totalPlatformFees = paidOrders.reduce((acc, o) => acc + Number(o.platformFeeTotal), 0);
    const averageTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        paidOrdersCount: paidOrders.length,
        totalOrdersCount: ordersCount,
        customersCount,
        productsCount,
        criticalStockCount,
        averageTicket: Math.round(averageTicket * 100) / 100,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Erro em GET /api/admin/stats:', error);
    return res.status(500).json({
      success: false,
      error: 'AdminStatsError',
      message: error.message || 'Falha ao buscar estatísticas do ERP.',
    });
  }
});

/**
 * GET /api/admin/reports
 * DRE gerencial e consolidação financeira com dados reais do banco
 */
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const days = period === '7d' ? 7 : period === '15d' ? 15 : 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const paidOrders = await prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.PICKING, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        createdAt: { gte: sinceDate },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let receitaBruta = 0;
    let cmvTotal = 0;
    let taxasCanais = 0;
    let freteCobrado = 0;
    let descontos = 0;

    for (const order of paidOrders) {
      receitaBruta += Number(order.grossTotal);
      taxasCanais += Number(order.platformFeeTotal);
      freteCobrado += Number(order.shippingCharged);
      descontos += Number(order.discountTotal);

      for (const item of order.items) {
        cmvTotal += Number(item.unitCostCmv) * item.quantity;
      }
    }

    const impostoSimples = Math.round(receitaBruta * 0.05 * 100) / 100; // 5% Simples Nacional
    const embalagemOperacional = paidOrders.length * 2.5; // R$ 2,50 por pacote
    const receitaLiquida = Math.round((receitaBruta - taxasCanais - impostoSimples) * 100) / 100;
    const lucroBruto = Math.round((receitaLiquida - cmvTotal) * 100) / 100;
    const lucroLiquido = Math.round((lucroBruto - embalagemOperacional) * 100) / 100;
    const margemLiquidaPct = receitaBruta > 0 ? Math.round((lucroLiquido / receitaBruta) * 1000) / 10 : 0;

    return res.status(200).json({
      success: true,
      period: `${days} dias`,
      ordersCount: paidOrders.length,
      dre: {
        receitaBruta: Math.round(receitaBruta * 100) / 100,
        descontos: Math.round(descontos * 100) / 100,
        taxasMarketplaceGateway: Math.round(taxasCanais * 100) / 100,
        impostosDas: impostoSimples,
        receitaLiquida,
        cmv: Math.round(cmvTotal * 100) / 100,
        lucroBruto,
        custosOperacionaisEmbalagem: embalagemOperacional,
        lucroLiquido,
        margemLiquidaPct,
      },
    });
  } catch (error: any) {
    console.error('Erro em GET /api/admin/reports:', error);
    return res.status(500).json({
      success: false,
      error: 'AdminReportsError',
      message: error.message || 'Falha ao gerar relatório financeiro.',
    });
  }
});

/**
 * PUT /api/admin/orders/:id/status
 * Atualização de status operacional do pedido (PICKING, CHECKED, PACKED, SHIPPED, DELIVERED, CANCELLED)
 */
router.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, trackingCode, carrierName } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'InvalidStatus',
        message: `Status inválido. Permitidos: ${Object.values(OrderStatus).join(', ')}`,
      });
    }

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
      return res.status(404).json({ success: false, error: 'OrderNotFound', message: `Pedido ${id} não encontrado.` });
    }

    const previousStatus = order.status;

    // Se mudou para SHIPPED e forneceu código de rastreamento, salva ou atualiza pacote
    if (trackingCode) {
      const existingPackage = await prisma.shipmentPackage.findFirst({
        where: { orderId: order.id },
      });

      if (existingPackage) {
        await prisma.shipmentPackage.update({
          where: { id: existingPackage.id },
          data: {
            trackingCode,
            carrierName: carrierName || existingPackage.carrierName,
            currentStatus: 'IN_TRANSIT',
          },
        });
      } else {
        await prisma.shipmentPackage.create({
          data: {
            orderId: order.id,
            carrierName: carrierName || 'Correios SEDEX',
            trackingCode,
            currentStatus: 'IN_TRANSIT',
            eventsJson: [
              {
                timestamp: new Date().toISOString(),
                description: 'Objeto postado e em trânsito',
                location: 'CD Central São Paulo',
              },
            ],
          },
        });
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: status as OrderStatus,
        ...(trackingCode ? { trackingCode } : {}),
        ...(status === 'SHIPPED' ? { shippedAt: new Date() } : {}),
        ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    });

    // Registrar no Log de Auditoria do ERP
    await prisma.auditLog.create({
      data: {
        tenantId: order.tenantId,
        entityName: 'Order',
        entityId: order.id,
        action: 'STATUS_UPDATED',
        beforeState: { status: previousStatus },
        afterState: { status, trackingCode },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Status do pedido ${order.orderNumber} atualizado para ${status}!`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Erro em PUT /api/admin/orders/:id/status:', error);
    return res.status(500).json({
      success: false,
      error: 'UpdateOrderStatusError',
      message: error.message || 'Falha ao atualizar status do pedido.',
    });
  }
});

export default router;
