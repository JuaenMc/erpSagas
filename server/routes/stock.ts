import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, StockMovementType } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * 1. GET /api/stock
 * Retorna o estoque consolidado por variação e depósito
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouseId, belowSafety } = req.query;

    const whereClause: any = {};
    if (warehouseId && typeof warehouseId === 'string') {
      whereClause.warehouseId = warehouseId;
    }

    const stocks = await prisma.warehouseStock.findMany({
      where: whereClause,
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
        variation: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            barcodeEan13: true,
            product: {
              select: {
                id: true,
                title: true,
                masterSku: true,
                coverImageUrl: true,
                basePrice: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = stocks.map(s => {
      const available = Math.max(0, s.stockPhysical - s.stockReservedOrder - s.stockReservedPromo);
      const isBelowSafety = available <= s.safetyStock;

      return {
        id: s.id,
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseCode: s.warehouse.code,
        variationId: s.variationId,
        sku: s.variation.sku,
        size: s.variation.size,
        color: s.variation.color,
        barcodeEan13: s.variation.barcodeEan13,
        productTitle: s.variation.product.title,
        masterSku: s.variation.product.masterSku,
        coverImageUrl: s.variation.product.coverImageUrl,
        basePrice: Number(s.variation.product.basePrice),
        stockPhysical: s.stockPhysical,
        stockReservedOrder: s.stockReservedOrder,
        stockReservedPromo: s.stockReservedPromo,
        stockAvailable: available,
        safetyStock: s.safetyStock,
        minStockAlert: s.minStockAlert,
        isBelowSafety,
      };
    });

    const filtered = belowSafety === 'true'
      ? formatted.filter(s => s.isBelowSafety)
      : formatted;

    return res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. GET /api/stock/:variationId
 * Retorna o estoque detalhado de uma variação em todos os depósitos
 */
router.get('/:variationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variationId } = req.params;

    const stocks = await prisma.warehouseStock.findMany({
      where: { variationId },
      include: {
        warehouse: true,
        variation: {
          include: {
            product: true,
          },
        },
        movements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!stocks || stocks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Nenhum registro de estoque encontrado para a variação ${variationId}.`,
      });
    }

    const totalPhysical = stocks.reduce((acc, s) => acc + s.stockPhysical, 0);
    const totalReserved = stocks.reduce((acc, s) => acc + s.stockReservedOrder + s.stockReservedPromo, 0);
    const totalAvailable = Math.max(0, totalPhysical - totalReserved);

    return res.status(200).json({
      success: true,
      data: {
        variationId,
        sku: stocks[0].variation.sku,
        size: stocks[0].variation.size,
        color: stocks[0].variation.color,
        productTitle: stocks[0].variation.product.title,
        totalPhysical,
        totalReserved,
        totalAvailable,
        warehouses: stocks.map(s => ({
          warehouseId: s.warehouseId,
          warehouseName: s.warehouse.name,
          warehouseCode: s.warehouse.code,
          stockPhysical: s.stockPhysical,
          stockReservedOrder: s.stockReservedOrder,
          stockAvailable: Math.max(0, s.stockPhysical - s.stockReservedOrder - s.stockReservedPromo),
          safetyStock: s.safetyStock,
        })),
        recentMovements: stocks[0].movements,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. POST /api/stock/movement
 * Registra movimentação de estoque com atualização de saldo físico e auditoria
 */
router.post('/movement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      variationId,
      warehouseId,
      type = 'CYCLE_COUNT_ADJUST',
      quantity,
      referenceDocument,
      notes,
      createdById,
    } = req.body;

    if (!variationId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Campos obrigatórios: variationId e quantity (número inteiro positivo ou negativo).',
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'A quantidade deve ser diferente de zero.',
      });
    }

    // Identificar depósito padrão caso não informado
    let targetWhId = warehouseId;
    if (!targetWhId) {
      const defaultWh = await prisma.warehouse.findFirst();
      if (!defaultWh) {
        return res.status(500).json({
          success: false,
          error: 'ConfigurationError',
          message: 'Nenhum depósito cadastrado no sistema.',
        });
      }
      targetWhId = defaultWh.id;
    }

    // A4: Movimentação transacional via Prisma $transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar ou criar o registro de estoque do SKU naquele depósito
      let stock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_variationId: {
            warehouseId: targetWhId,
            variationId,
          },
        },
      });

      if (!stock) {
        stock = await tx.warehouseStock.create({
          data: {
            warehouseId: targetWhId,
            variationId,
            stockPhysical: 0,
            safetyStock: 5,
            minStockAlert: 10,
          },
        });
      }

      // Validar se há saldo físico suficiente caso seja saída
      if (qty < 0 && stock.stockPhysical + qty < 0) {
        throw new Error(`Saldo insuficiente: estoque físico atual é ${stock.stockPhysical}, saída solicitada é ${Math.abs(qty)}.`);
      }

      const newBalance = stock.stockPhysical + qty;

      // 2. Atualizar saldo do WarehouseStock
      const updatedStock = await tx.warehouseStock.update({
        where: { id: stock.id },
        data: {
          stockPhysical: newBalance,
          updatedAt: new Date(),
        },
      });

      // 3. Registrar histórico imutável em StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          warehouseStockId: stock.id,
          type: type as StockMovementType,
          quantity: qty,
          balanceAfter: newBalance,
          referenceDocument: referenceDocument || null,
          notes: notes || null,
          createdById: createdById || null,
        },
      });

      return {
        stock: updatedStock,
        movement,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Movimentação de estoque registrada com sucesso!',
      data: {
        movementId: result.movement.id,
        type: result.movement.type,
        quantity: result.movement.quantity,
        previousBalance: result.stock.stockPhysical - qty,
        newBalance: result.stock.stockPhysical,
        variationId,
        warehouseId: targetWhId,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
