import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, ProductType, StockMovementType } from '@prisma/client';
import { toStoreProductDto } from '../dto/product.dto';

const router = Router();
const prisma = new PrismaClient();

/**
 * Resolve categoryId a partir de category ou categoryId enviado no payload
 */
async function resolveCategoryId(
  txOrPrisma: any,
  tenantId: string,
  categoryInput?: string
): Promise<string> {
  const raw = (categoryInput || '').trim().toLowerCase();

  let slug = 'feminino';
  let name = 'Feminino';
  let defaultId = 'cat-feminino';

  if (raw.includes('infant') || raw === 'cat-infantil') {
    slug = 'infantil';
    name = 'Infantil';
    defaultId = 'cat-infantil';
  } else if (raw.includes('masculin') || raw === 'cat-masculino') {
    slug = 'masculino';
    name = 'Masculino';
    defaultId = 'cat-masculino';
  } else if (raw.includes('feminin') || raw === 'cat-feminino') {
    slug = 'feminino';
    name = 'Feminino';
    defaultId = 'cat-feminino';
  } else if (categoryInput && categoryInput.startsWith('cat-')) {
    const existingById = await txOrPrisma.category.findUnique({ where: { id: categoryInput } });
    if (existingById) return existingById.id;
  }

  const found = await txOrPrisma.category.findFirst({
    where: {
      OR: [{ id: defaultId }, { slug }],
    },
  });

  if (found) return found.id;

  const created = await txOrPrisma.category.create({
    data: {
      id: defaultId,
      tenantId,
      name,
      slug,
    },
  });
  return created.id;
}

/**
 * 1. GET /api/products
 * Retorna todos os produtos ativos com suas variações e estoques calculados.
 * Se ?includeInactive=true for passado (Admin ERP), retorna também os inativos (deletedAt != null).
 * Se um produto estiver com isActive: false (deletedAt != null), a loja sagas.moda NÃO o recebe.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, includeInactive } = req.query;
    const showInactive = includeInactive === 'true';

    const where: any = showInactive ? {} : { deletedAt: null };

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.OR = [
        { category: { slug: category.toLowerCase() } },
        { category: { name: { contains: category, mode: 'insensitive' } } },
        { categoryId: category },
      ];
    }

    if (search && typeof search === 'string') {
      const searchCond = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { masterSku: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCond }];
        delete where.OR;
      } else {
        where.OR = searchCond;
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variations: {
          where: showInactive ? {} : { deletedAt: null },
          include: {
            stocks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = products.map(toStoreProductDto);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. GET /api/products/:id
 * Retorna um produto específico por ID ou masterSku
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { masterSku: id }],
      },
      include: {
        category: true,
        variations: {
          where: { deletedAt: null },
          include: {
            stocks: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Produto com identificador '${id}' não encontrado.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: toStoreProductDto(product),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. POST /api/products
 * Cria um novo produto com suas variações e estoque inicial no depósito principal
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      name,
      masterSku,
      sku,
      description,
      price,
      basePrice,
      costPrice,
      stock,
      initialStockPerVariation,
      category,
      categoryId,
      brand,
      type,
      weightGrams,
      heightCm,
      widthCm,
      depthCm,
      lengthCm,
      ncm,
      cest,
      cfopDefault,
      cfopPadrao,
      icmsOrigin,
      origemMercadoria,
      images,
      coverImageUrl,
      mediaGallery,
      isActive = true,
      variations = [],
    } = req.body;

    const resolvedTitle = (title || name || '').trim();
    const resolvedPrice = Number(price ?? basePrice);
    const resolvedCostPrice = Number(costPrice ?? 0);
    const defaultStock = Number(stock ?? initialStockPerVariation ?? 0);

    // Validação rigorosa de dados (Tarefa 6)
    if (!resolvedTitle) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'O título (title) do produto é obrigatório.',
      });
    }

    if (isNaN(resolvedPrice) || resolvedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'O preço de venda (price/basePrice) deve ser um valor positivo maior que zero.',
      });
    }

    if (isNaN(resolvedCostPrice) || resolvedCostPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'O preço de custo (costPrice) não pode ser negativo.',
      });
    }

    const resolvedMasterSku = (
      masterSku ||
      sku ||
      `SAG-${resolvedTitle
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase()}-${Date.now().toString().slice(-4)}`
    )
      .trim()
      .toUpperCase();

    // Obter ou criar tenant padrão
    let tenant =
      (await prisma.tenant.findFirst({ where: { slug: 'sagas-moda' } })) ||
      (await prisma.tenant.findFirst());
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: 'tenant-sagas-principal',
          name: 'SAGAS.MODA Comércio de Vestuário Ltda',
          slug: 'sagas-moda',
        },
      });
    }

    // Verificar duplicidade de masterSku
    const existingProduct = await prisma.product.findFirst({
      where: { masterSku: resolvedMasterSku },
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: `Já existe um produto cadastrado com o SKU Mestre '${resolvedMasterSku}'. Escolha um SKU único.`,
      });
    }

    // Resolver imagens
    const imageArray: string[] = Array.isArray(images)
      ? images.filter((u: any) => typeof u === 'string' && u.trim() !== '')
      : [];
    const galleryArray: string[] = Array.isArray(mediaGallery)
      ? mediaGallery
          .map((item: any) => (typeof item === 'string' ? item : item?.url))
          .filter((u: any) => typeof u === 'string' && u.trim() !== '')
      : [];

    const allImages = Array.from(
      new Set([
        ...(coverImageUrl && typeof coverImageUrl === 'string' ? [coverImageUrl.trim()] : []),
        ...imageArray,
        ...galleryArray,
      ])
    );
    const primaryImage = allImages[0] || '';

    // Obter ou criar depósito principal
    let warehouse =
      (await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } })) ||
      (await prisma.warehouse.findFirst());
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          id: 'wh-cd-sp-main',
          tenantId: tenant.id,
          name: 'Centro de Distribuição Principal - São Paulo',
          code: 'CD-SP-01',
        },
      });
    }

    // Garantir variações válidas
    const normalizedVariations =
      Array.isArray(variations) && variations.length > 0
        ? variations
        : [
            {
              size: 'Único',
              color: 'Padrão',
              sku: `${resolvedMasterSku}-UN`,
              stock: defaultStock,
              price: resolvedPrice,
              costPrice: resolvedCostPrice,
            },
          ];

    // Validar SKUs das variações contra duplicidade no banco
    const variationSkus = normalizedVariations.map((v: any, idx: number) =>
      String(v.sku || `${resolvedMasterSku}-${v.size || idx + 1}`)
        .trim()
        .toUpperCase()
    );

    const existingVarSku = await prisma.productVariation.findFirst({
      where: { sku: { in: variationSkus } },
    });
    if (existingVarSku) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: `A variação com SKU '${existingVarSku.sku}' já existe no banco de dados.`,
      });
    }

    const createdProduct = await prisma.$transaction(async (tx) => {
      const targetCategoryId = await resolveCategoryId(
        tx,
        tenant!.id,
        categoryId || category
      );

      const newProd = await tx.product.create({
        data: {
          tenantId: tenant!.id,
          categoryId: targetCategoryId,
          masterSku: resolvedMasterSku,
          title: resolvedTitle,
          description: description || '',
          brand: brand || 'sagas.moda',
          type: (type as ProductType) || ProductType.VARIABLE,
          basePrice: resolvedPrice,
          costPrice: resolvedCostPrice,
          weightGrams: Number(weightGrams || 250),
          heightCm: Number(heightCm || 4),
          widthCm: Number(widthCm || 20),
          depthCm: Number(depthCm ?? lengthCm ?? 25),
          ncm: String(ncm || '61044200').slice(0, 10),
          cest: cest ? String(cest).slice(0, 10) : '2805900',
          cfopDefault: cfopDefault || cfopPadrao || '5102',
          icmsOrigin: Number(icmsOrigin ?? origemMercadoria ?? 0),
          coverImageUrl: primaryImage,
          mediaGallery: allImages,
          deletedAt: isActive === false ? new Date() : null,
        },
      });

      for (let i = 0; i < normalizedVariations.length; i++) {
        const v = normalizedVariations[i];
        const varSku = variationSkus[i];
        const barcodeEan13 =
          v.barcodeEan13 ||
          `789${Math.floor(1000000000 + Math.random() * 9000000000)}`.slice(0, 13);

        const createdVar = await tx.productVariation.create({
          data: {
            productId: newProd.id,
            sku: varSku,
            barcodeEan13,
            size: v.size || 'Único',
            color: v.color || 'Padrão',
            priceOverride: v.price ? Number(v.price) : null,
            costPriceOverride: v.costPrice ? Number(v.costPrice) : null,
          },
        });

        const initialPhysical = Math.max(
          0,
          Number(v.stock ?? v.stockReal ?? v.stockPhysical ?? defaultStock ?? 0)
        );

        const createdStock = await tx.warehouseStock.create({
          data: {
            warehouseId: warehouse!.id,
            variationId: createdVar.id,
            stockPhysical: initialPhysical,
            stockReservedOrder: 0,
            stockReservedPromo: 0,
            safetyStock: 2,
          },
        });

        if (initialPhysical > 0) {
          await tx.stockMovement.create({
            data: {
              warehouseStockId: createdStock.id,
              type: StockMovementType.PURCHASE_IN,
              quantity: initialPhysical,
              balanceAfter: initialPhysical,
              referenceDocument: newProd.masterSku,
              notes: `Estoque inicial no cadastro de produto (${createdVar.sku})`,
            },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: newProd.id },
        include: {
          category: true,
          variations: {
            include: { stocks: true },
          },
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso no banco Neon!',
      data: toStoreProductDto(createdProduct),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. PUT /api/products/:id
 * Atualiza dados de um produto existente, status ativo/inativo e suas variações/estoques
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      title,
      name,
      description,
      price,
      basePrice,
      costPrice,
      stock,
      category,
      categoryId,
      brand,
      weightGrams,
      images,
      coverImageUrl,
      mediaGallery,
      isActive,
      variations,
    } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        variations: {
          include: { stocks: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Produto '${id}' não encontrado para atualização.`,
      });
    }

    const resolvedPrice =
      price !== undefined || basePrice !== undefined
        ? Number(price ?? basePrice)
        : Number(existing.basePrice);

    const resolvedCostPrice =
      costPrice !== undefined ? Number(costPrice) : Number(existing.costPrice || 0);

    if (isNaN(resolvedPrice) || resolvedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'O preço de venda deve ser maior que zero.',
      });
    }

    if (isNaN(resolvedCostPrice) || resolvedCostPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'O preço de custo não pode ser negativo.',
      });
    }

    const warehouse =
      (await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } })) ||
      (await prisma.warehouse.findFirst());

    const updated = await prisma.$transaction(async (tx) => {
      let targetCategoryId = existing.categoryId;
      if (category || categoryId) {
        targetCategoryId = await resolveCategoryId(
          tx,
          existing.tenantId,
          categoryId || category
        );
      }

      // Resolver imagens se enviadas
      let newCoverImage = existing.coverImageUrl;
      let newGallery: any = existing.mediaGallery;

      if (images !== undefined || coverImageUrl !== undefined || mediaGallery !== undefined) {
        const imgArr: string[] = Array.isArray(images)
          ? images.filter((u: any) => typeof u === 'string' && u.trim() !== '')
          : [];
        const galArr: string[] = Array.isArray(mediaGallery)
          ? mediaGallery
              .map((item: any) => (typeof item === 'string' ? item : item?.url))
              .filter((u: any) => typeof u === 'string' && u.trim() !== '')
          : [];

        const merged = Array.from(
          new Set([
            ...(coverImageUrl && typeof coverImageUrl === 'string' ? [coverImageUrl.trim()] : []),
            ...imgArr,
            ...galArr,
          ])
        );
        newCoverImage = merged[0] || '';
        newGallery = merged;
      }

      await tx.product.update({
        where: { id },
        data: {
          title: (title ?? name ?? existing.title).trim(),
          description: description !== undefined ? description : existing.description,
          basePrice: resolvedPrice,
          costPrice: resolvedCostPrice,
          categoryId: targetCategoryId,
          brand: brand !== undefined ? brand : existing.brand,
          weightGrams: weightGrams !== undefined ? Number(weightGrams) : existing.weightGrams,
          coverImageUrl: newCoverImage,
          mediaGallery: newGallery,
          ...(isActive !== undefined
            ? { deletedAt: isActive === false ? new Date() : null }
            : {}),
        },
      });

      // Atualizar ou criar variações se enviadas no payload
      if (Array.isArray(variations) && variations.length > 0 && warehouse) {
        for (let i = 0; i < variations.length; i++) {
          const v = variations[i];
          const targetStock =
            v.stock !== undefined || v.stockReal !== undefined || v.stockPhysical !== undefined
              ? Math.max(0, Number(v.stock ?? v.stockReal ?? v.stockPhysical ?? 0))
              : stock !== undefined
              ? Math.max(0, Number(stock))
              : undefined;

          const existingVar = existing.variations.find(
            (ev) => (v.id && ev.id === v.id) || (v.sku && ev.sku === v.sku)
          );

          if (existingVar) {
            await tx.productVariation.update({
              where: { id: existingVar.id },
              data: {
                size: v.size ?? existingVar.size,
                color: v.color ?? existingVar.color,
                sku: v.sku ? String(v.sku).trim().toUpperCase() : existingVar.sku,
                priceOverride: v.price !== undefined ? Number(v.price) : existingVar.priceOverride,
                costPriceOverride:
                  v.costPrice !== undefined ? Number(v.costPrice) : existingVar.costPriceOverride,
                deletedAt: null,
              },
            });

            if (targetStock !== undefined) {
              const st = existingVar.stocks?.[0];
              if (st) {
                await tx.warehouseStock.update({
                  where: { id: st.id },
                  data: { stockPhysical: targetStock },
                });
              } else {
                await tx.warehouseStock.create({
                  data: {
                    warehouseId: warehouse.id,
                    variationId: existingVar.id,
                    stockPhysical: targetStock,
                    stockReservedOrder: 0,
                    stockReservedPromo: 0,
                  },
                });
              }
            }
          } else {
            const newSku = String(
              v.sku || `${existing.masterSku}-${v.size || i + 1}-${Date.now().toString().slice(-3)}`
            )
              .trim()
              .toUpperCase();
            const barcodeEan13 =
              v.barcodeEan13 ||
              `789${Math.floor(1000000000 + Math.random() * 9000000000)}`.slice(0, 13);

            const createdVar = await tx.productVariation.create({
              data: {
                productId: existing.id,
                sku: newSku,
                barcodeEan13,
                size: v.size || 'Único',
                color: v.color || 'Padrão',
                priceOverride: v.price ? Number(v.price) : null,
                costPriceOverride: v.costPrice ? Number(v.costPrice) : null,
              },
            });

            await tx.warehouseStock.create({
              data: {
                warehouseId: warehouse.id,
                variationId: createdVar.id,
                stockPhysical: targetStock ?? 0,
                stockReservedOrder: 0,
                stockReservedPromo: 0,
                safetyStock: 2,
              },
            });
          }
        }
      }

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

    return res.status(200).json({
      success: true,
      message: 'Produto atualizado com sucesso!',
      data: toStoreProductDto(updated),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. PATCH /api/products/:id/stock
 * Gestão de Estoque em Tempo Real (+1 / -1 ou valor direto) por Produto ou Variação
 */
router.patch('/:id/stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { delta, stock, variationId, sku, reason } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variations: {
          where: { deletedAt: null },
          include: { stocks: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Produto '${id}' não encontrado.`,
      });
    }

    const warehouse =
      (await prisma.warehouse.findFirst({ where: { code: 'CD-SP-01' } })) ||
      (await prisma.warehouse.findFirst());

    if (!warehouse) {
      return res.status(500).json({
        success: false,
        error: 'WarehouseError',
        message: 'Depósito principal não encontrado.',
      });
    }

    let targetVariation = product.variations[0];
    if (variationId) {
      const found = product.variations.find((v) => v.id === variationId);
      if (found) targetVariation = found;
    } else if (sku) {
      const found = product.variations.find((v) => v.sku === sku);
      if (found) targetVariation = found;
    }

    if (!targetVariation) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: 'Nenhuma variação encontrada para ajustar estoque deste produto.',
      });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      let stockRow = await tx.warehouseStock.findFirst({
        where: {
          warehouseId: warehouse.id,
          variationId: targetVariation.id,
        },
      });

      if (!stockRow) {
        stockRow = await tx.warehouseStock.create({
          data: {
            warehouseId: warehouse.id,
            variationId: targetVariation.id,
            stockPhysical: 0,
            stockReservedOrder: 0,
            stockReservedPromo: 0,
            safetyStock: 2,
          },
        });
      }

      const currentPhysical = Number(stockRow.stockPhysical);
      let newPhysical = currentPhysical;

      if (delta !== undefined && !isNaN(Number(delta))) {
        newPhysical = Math.max(0, currentPhysical + Number(delta));
      } else if (stock !== undefined && !isNaN(Number(stock))) {
        newPhysical = Math.max(0, Number(stock));
      } else {
        const err: any = new Error('Informe delta (+1/-1) ou stock (quantidade absoluta).');
        err.statusCode = 400;
        err.name = 'ValidationError';
        throw err;
      }

      const diff = newPhysical - currentPhysical;

      await tx.warehouseStock.update({
        where: { id: stockRow.id },
        data: { stockPhysical: newPhysical },
      });

      if (diff !== 0) {
        await tx.stockMovement.create({
          data: {
            warehouseStockId: stockRow.id,
            type: StockMovementType.CYCLE_COUNT_ADJUST,
            quantity: diff,
            balanceAfter: newPhysical,
            referenceDocument: `ERP-QUICK-${Date.now()}`,
            notes:
              reason ||
              `Ajuste rápido de estoque no ERP (${diff > 0 ? `+${diff}` : diff}) na variação ${targetVariation.sku}`,
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: {
          category: true,
          variations: {
            where: { deletedAt: null },
            include: { stocks: true },
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Estoque atualizado imediatamente no banco Neon!',
      data: toStoreProductDto(updatedProduct),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 6. DELETE /api/products/:id
 * Remove o produto do catálogo (hard delete se não possuir pedidos vinculados; soft delete caso contrário)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        variations: {
          include: {
            orderItems: { select: { id: true }, take: 1 },
            stocks: { select: { id: true } },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Produto '${id}' não encontrado.`,
      });
    }

    const hasOrderItems = existing.variations.some((v) => v.orderItems && v.orderItems.length > 0);

    if (!hasOrderItems) {
      await prisma.$transaction(async (tx) => {
        const variationIds = existing.variations.map((v) => v.id);
        const stockIds = existing.variations.flatMap((v) => v.stocks.map((s) => s.id));

        if (stockIds.length > 0) {
          await tx.stockMovement.deleteMany({ where: { warehouseStockId: { in: stockIds } } });
          await tx.warehouseStock.deleteMany({ where: { id: { in: stockIds } } });
        }
        if (variationIds.length > 0) {
          await tx.productVariation.deleteMany({ where: { id: { in: variationIds } } });
        }
        await tx.channelListing.deleteMany({ where: { productId: id } });
        await tx.productChannelPricing.deleteMany({ where: { productId: id } });
        await tx.product.delete({ where: { id } });
      });

      return res.status(200).json({
        success: true,
        message: `Produto '${existing.title}' excluído permanentemente do banco de dados.`,
      });
    } else {
      const now = new Date();
      await prisma.$transaction([
        prisma.product.update({
          where: { id },
          data: { deletedAt: now },
        }),
        prisma.productVariation.updateMany({
          where: { productId: id },
          data: { deletedAt: now },
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: `Produto '${existing.title}' desativado e ocultado da loja (histórico de pedidos preservado).`,
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
