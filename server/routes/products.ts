import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, ProductType } from '@prisma/client';
import { toStoreProductDto } from '../dto/product.dto';

const router = Router();
const prisma = new PrismaClient();

/**
 * 1. GET /api/products
 * Lista todos os produtos com suas variações e estoque, convertidos para StoreProductDto
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, search } = req.query;

    const whereClause: any = {
      deletedAt: null,
    };

    if (categoryId && typeof categoryId === 'string') {
      whereClause.categoryId = categoryId;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { masterSku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        variations: {
          where: { deletedAt: null },
          include: {
            stocks: true,
          },
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const dtos = products.map(p => toStoreProductDto(p));

    return res.status(200).json({
      success: true,
      count: dtos.length,
      data: dtos,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. GET /api/products/:id
 * Retorna o produto individual detalhado com todas as variações e estoques
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        category: true,
        variations: {
          where: { deletedAt: null },
          include: {
            stocks: true,
          },
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
        channelPricings: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Produto com ID ${id} não foi encontrado.`,
      });
    }

    const dto = toStoreProductDto(product);

    return res.status(200).json({
      success: true,
      data: dto,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. POST /api/products
 * Criação transacional de Produto + Variações + Estoque inicial
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      masterSku,
      description,
      categoryId,
      basePrice,
      costPrice,
      coverImageUrl,
      mediaGallery,
      type = ProductType.VARIABLE,
      weightGrams = 250,
      heightCm = 4.0,
      widthCm = 20.0,
      depthCm = 25.0,
      ncm = '6104.42.00',
      cfopDefault = '5102',
      variations = [],
      initialStockPerVariation = 0,
      warehouseId,
    } = req.body;

    if (!title || !masterSku || !basePrice) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Campos obrigatórios: title, masterSku, basePrice.',
      });
    }

    // Identificar tenant e depósito padrão
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      return res.status(500).json({
        success: false,
        error: 'ConfigurationError',
        message: 'Nenhum tenant cadastrado no sistema.',
      });
    }

    let defaultCategory = categoryId;
    if (!defaultCategory) {
      const firstCat = await prisma.category.findFirst({ where: { tenantId: tenant.id } });
      defaultCategory = firstCat?.id;
    }

    let targetWarehouseId = warehouseId;
    if (!targetWarehouseId) {
      const wh = await prisma.warehouse.findFirst({ where: { tenantId: tenant.id } });
      targetWarehouseId = wh?.id;
    }

    // A4: Escrita transacional via Prisma $transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      // 1. Criar Produto
      const createdProduct = await tx.product.create({
        data: {
          tenantId: tenant.id,
          title,
          masterSku,
          description: description || '',
          categoryId: defaultCategory,
          type: type as ProductType,
          basePrice: Number(basePrice),
          costPrice: Number(costPrice || Number(basePrice) * 0.4),
          weightGrams: Number(weightGrams),
          heightCm: Number(heightCm),
          widthCm: Number(widthCm),
          depthCm: Number(depthCm),
          ncm: String(ncm),
          cfopDefault: String(cfopDefault),
          coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80',
          mediaGallery: Array.isArray(mediaGallery) ? mediaGallery : [],
        },
      });

      // 2. Se não vieram variações estruturadas, criar ao menos uma variação padrão (Único / Padrão)
      const varsToCreate = variations.length > 0
        ? variations
        : [{ size: 'Único', color: 'Padrão', sku: `${masterSku}-UNI`, stock: initialStockPerVariation }];

      for (let i = 0; i < varsToCreate.length; i++) {
        const v = varsToCreate[i];
        const varSku = v.sku || `${masterSku}-${v.size}-${v.color}`.replace(/\s+/g, '-').toUpperCase();
        const barcode = v.barcodeEan13 || `789${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        const createdVariation = await tx.productVariation.create({
          data: {
            productId: createdProduct.id,
            sku: varSku,
            size: v.size || 'Único',
            color: v.color || 'Padrão',
            barcodeEan13: barcode,
            priceOverride: v.price ? Number(v.price) : null,
            costPriceOverride: v.costPrice ? Number(v.costPrice) : null,
          },
        });

        // 3. Inicializar estoque no depósito central
        const stockQty = Number(v.stock ?? initialStockPerVariation ?? 0);
        if (targetWarehouseId) {
          const createdStock = await tx.warehouseStock.create({
            data: {
              warehouseId: targetWarehouseId,
              variationId: createdVariation.id,
              stockPhysical: stockQty,
              safetyStock: 5,
              minStockAlert: 10,
            },
          });

          if (stockQty > 0) {
            await tx.stockMovement.create({
              data: {
                warehouseStockId: createdStock.id,
                type: 'PURCHASE_IN',
                quantity: stockQty,
                balanceAfter: stockQty,
                referenceDocument: 'INVENTARIO_INICIAL_CADASTRO',
                notes: 'Saldo inicial registrado na criação do produto',
              },
            });
          }
        }
      }

      // 4. Retornar produto completo com relações
      return tx.product.findUniqueOrThrow({
        where: { id: createdProduct.id },
        include: {
          category: true,
          variations: {
            include: { stocks: true },
          },
        },
      });
    });

    const dto = toStoreProductDto(newProduct);
    return res.status(201).json({
      success: true,
      message: 'Produto e variações criados com sucesso!',
      data: dto,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * 4. PUT /api/products/:id
 * Atualização transacional de dados do produto
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      basePrice,
      costPrice,
      coverImageUrl,
      categoryId,
      weightGrams,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(basePrice && { basePrice: Number(basePrice) }),
          ...(costPrice && { costPrice: Number(costPrice) }),
          ...(coverImageUrl && { coverImageUrl }),
          ...(categoryId && { categoryId }),
          ...(weightGrams && { weightGrams: Number(weightGrams) }),
          updatedAt: new Date(),
        },
      });

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          category: true,
          variations: {
            where: { deletedAt: null },
            include: { stocks: true },
          },
        },
      });
    });

    const dto = toStoreProductDto(updated);
    return res.status(200).json({
      success: true,
      message: 'Produto atualizado com sucesso!',
      data: dto,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. DELETE /api/products/:id
 * Soft delete do produto e suas variações
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Soft delete no produto
      await tx.product.update({
        where: { id },
        data: { deletedAt: now },
      });

      // Soft delete nas variações
      await tx.productVariation.updateMany({
        where: { productId: id },
        data: { deletedAt: now },
      });
    });

    return res.status(200).json({
      success: true,
      message: `Produto ${id} removido com sucesso (soft-delete).`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
