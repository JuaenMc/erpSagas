import { Router, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest, optionalAuth, requireAuth } from '../middleware/auth';
import { toStoreProductDto } from '../dto/product.dto';

const router = Router();

/**
 * GET /api/favorites
 * Lista os produtos favoritados pelo usuário autenticado
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: [],
        productIds: [],
        count: 0,
      });
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        OR: [{ userId }, { customerId: userId }],
      },
      include: {
        product: {
          include: {
            category: true,
            variations: {
              where: { deletedAt: null },
              include: { stocks: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productIds = favorites.map((f) => f.productId);
    const products = favorites.map((f) => toStoreProductDto(f.product));

    return res.status(200).json({
      success: true,
      count: favorites.length,
      productIds,
      data: products,
    });
  } catch (error: any) {
    console.error('Erro em GET /api/favorites:', error);
    return res.status(500).json({
      success: false,
      error: 'GetFavoritesError',
      message: error.message || 'Falha ao buscar favoritos.',
    });
  }
});

/**
 * POST /api/favorites
 * Adiciona um produto aos favoritos do usuário no banco Neon
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'productId é obrigatório.',
      });
    }

    // Verificar se produto existe
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

    // Upsert para garantir idempotência
    const fav = await prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId: userId!,
          productId,
        },
      },
      update: {},
      create: {
        userId: userId!,
        productId,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Produto adicionado aos favoritos com sucesso!',
      data: fav,
    });
  } catch (error: any) {
    console.error('Erro em POST /api/favorites:', error);
    return res.status(500).json({
      success: false,
      error: 'AddFavoriteError',
      message: error.message || 'Falha ao adicionar favorito.',
    });
  }
});

/**
 * DELETE /api/favorites/:productId
 * Remove um produto dos favoritos do usuário
 */
router.delete('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await prisma.favorite.deleteMany({
      where: {
        productId,
        OR: [{ userId }, { customerId: userId }],
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Produto removido dos favoritos.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'RemoveFavoriteError',
      message: error.message || 'Falha ao remover favorito.',
    });
  }
});

export default router;
