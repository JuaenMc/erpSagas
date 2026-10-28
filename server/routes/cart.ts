import { Router, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest, optionalAuth, requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/cart
 * Retorna os itens do carrinho vinculados ao usuário autenticado
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        subtotal: 0,
      });
    }

    const items = await prisma.cartItem.findMany({
      where: {
        OR: [{ userId }, { customerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            masterSku: true,
            coverImageUrl: true,
            basePrice: true,
            costPrice: true,
            category: { select: { name: true, slug: true } },
          },
        },
        variation: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            barcodeEan13: true,
            priceOverride: true,
            stocks: { select: { stockPhysical: true, stockReservedOrder: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = items.map((it) => {
      const price = it.variation?.priceOverride ? Number(it.variation.priceOverride) : Number(it.product.basePrice);
      const stockItem = it.variation?.stocks?.[0];
      const availableStock = stockItem ? Math.max(0, stockItem.stockPhysical - stockItem.stockReservedOrder) : 10;

      return {
        id: it.id,
        productId: it.productId,
        variationId: it.variationId,
        title: it.product.title,
        name: it.product.title,
        coverImageUrl: it.product.coverImageUrl,
        image: it.product.coverImageUrl,
        price,
        quantity: it.quantity,
        size: it.size || it.variation?.size || 'Único',
        color: it.color || it.variation?.color || 'Padrão',
        sku: it.variation?.sku || it.product.masterSku,
        availableStock,
        totalItemPrice: price * it.quantity,
      };
    });

    const subtotal = formatted.reduce((acc, curr) => acc + curr.totalItemPrice, 0);

    return res.status(200).json({
      success: true,
      count: formatted.length,
      subtotal: Math.round(subtotal * 100) / 100,
      data: formatted,
    });
  } catch (error: any) {
    console.error('Erro em GET /api/cart:', error);
    return res.status(500).json({
      success: false,
      error: 'GetCartError',
      message: error.message || 'Falha ao buscar itens do carrinho.',
    });
  }
});

/**
 * POST /api/cart
 * Adiciona ou incrementa um item no carrinho do usuário no banco Neon
 */
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const { productId, variationId, quantity = 1, size, color } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'productId é obrigatório.',
      });
    }

    if (!userId) {
      // Usuário não autenticado, retorna instrução para manter localmente
      return res.status(200).json({
        success: true,
        guest: true,
        message: 'Item pronto para sincronização local.',
        data: { productId, variationId, quantity, size, color },
      });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'ProductNotFound',
        message: 'Produto não encontrado.',
      });
    }

    // Verificar se já existe o mesmo item no carrinho do usuário
    const existing = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        ...(variationId ? { variationId } : {}),
        ...(size ? { size } : {}),
        ...(color ? { color } : {}),
      },
    });

    let result;
    if (existing) {
      result = await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + Number(quantity),
          updatedAt: new Date(),
        },
      });
    } else {
      result = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          variationId: variationId || null,
          quantity: Number(quantity),
          size: size || null,
          color: color || null,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Item adicionado ao carrinho no banco Neon com sucesso!',
      data: result,
    });
  } catch (error: any) {
    console.error('Erro em POST /api/cart:', error);
    return res.status(500).json({
      success: false,
      error: 'AddToCartError',
      message: error.message || 'Falha ao adicionar item ao carrinho.',
    });
  }
});

/**
 * PUT /api/cart/:id
 * Atualiza quantidade de um item no carrinho
 */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) <= 0) {
      // Se quantidade for 0 ou negativa, remove o item
      await prisma.cartItem.deleteMany({ where: { id } });
      return res.status(200).json({
        success: true,
        message: 'Item removido do carrinho.',
      });
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: {
        quantity: Number(quantity),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Quantidade atualizada.',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'UpdateCartError',
      message: error.message || 'Falha ao atualizar quantidade.',
    });
  }
});

/**
 * DELETE /api/cart/:id
 * Remove item específico do carrinho
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.cartItem.deleteMany({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Item removido com sucesso.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'DeleteCartItemError',
      message: error.message || 'Falha ao remover item.',
    });
  }
});

/**
 * DELETE /api/cart
 * Limpa todo o carrinho do usuário
 */
router.delete('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (userId) {
      await prisma.cartItem.deleteMany({
        where: {
          OR: [{ userId }, { customerId: userId }],
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Carrinho limpo com sucesso.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'ClearCartError',
      message: error.message || 'Falha ao limpar carrinho.',
    });
  }
});

/**
 * POST /api/cart/sync
 * Sincroniza itens que estavam salvos localmente no navegador (localStorage) com o banco Neon após login
 */
router.post('/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const { items = [] } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum item pendente de sincronização.' });
    }

    for (const item of items) {
      const pId = item.productId || item.id;
      if (!pId) continue;

      const existing = await prisma.cartItem.findFirst({
        where: {
          userId,
          productId: pId,
          ...(item.variationId ? { variationId: item.variationId } : {}),
          ...(item.size ? { size: item.size } : {}),
          ...(item.color ? { color: item.color } : {}),
        },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.max(existing.quantity, Number(item.quantity || 1)),
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            userId,
            productId: pId,
            variationId: item.variationId || null,
            quantity: Number(item.quantity || 1),
            size: item.size || null,
            color: item.color || null,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Carrinho local sincronizado com o banco Neon com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro em POST /api/cart/sync:', error);
    return res.status(500).json({
      success: false,
      error: 'SyncCartError',
      message: error.message || 'Falha ao sincronizar carrinho.',
    });
  }
});

export default router;
