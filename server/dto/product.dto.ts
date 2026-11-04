import { Product, ProductVariation, WarehouseStock, Category } from '@prisma/client';

export interface StoreProductVariationDto {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  stockPhysical: number;
  stockReserved: number;
  price: number;
  costPrice: number;
  barcodeEan13: string;
}

export interface StoreProductDto {
  id: string;
  name: string;
  title: string;
  masterSku: string;
  description: string;
  price: number;
  basePrice: number;
  costPrice: number;
  sizes: string[];
  colors: string[];
  stock: number;
  images: string[];
  coverImageUrl: string;
  category: string;
  categoryId: string;
  brand: string;
  type: string;
  weightGrams: number;
  isActive: boolean;
  variations: StoreProductVariationDto[];
  createdAt: string;
  updatedAt: string;
}

type ProductWithRelations = Product & {
  category?: Category | null;
  variations?: (ProductVariation & {
    stocks?: WarehouseStock[];
  })[];
};

/**
 * Converte um Product do Prisma (com variações e estoques) no formato DTO
 * plano e compatível tanto com o Admin ERP quanto com a loja SAGAS Mobile.
 */
export function toStoreProductDto(product: ProductWithRelations): StoreProductDto {
  const variations = product.variations || [];

  // Coletar tamanhos e cores únicos
  const sizesSet = new Set<string>();
  const colorsSet = new Set<string>();
  let totalStock = 0;
  const basePriceNum = Number(product.basePrice);
  const costPriceNum = Number(product.costPrice || 0);
  let lowestPrice = basePriceNum;

  const activeVariations = variations.filter((v) => !v.deletedAt);
  const variationsToMap = activeVariations.length > 0 ? activeVariations : variations;

  const formattedVariations: StoreProductVariationDto[] = variationsToMap.map((v) => {
    if (v.size) sizesSet.add(v.size);
    if (v.color) colorsSet.add(v.color);

    let varPhysical = 0;
    let varReserved = 0;
    const varStock = (v.stocks || []).reduce((acc, s) => {
      varPhysical += Number(s.stockPhysical || 0);
      varReserved += Number(s.stockReservedOrder || 0) + Number(s.stockReservedPromo || 0);
      const available = Math.max(0, s.stockPhysical - s.stockReservedOrder - s.stockReservedPromo);
      return acc + available;
    }, 0);

    totalStock += varStock;

    const varPrice = v.priceOverride ? Number(v.priceOverride) : basePriceNum;
    const varCost = v.costPriceOverride ? Number(v.costPriceOverride) : costPriceNum;
    if (varPrice > 0 && varPrice < lowestPrice) {
      lowestPrice = varPrice;
    }

    return {
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: varStock,
      stockPhysical: varPhysical,
      stockReserved: varReserved,
      price: varPrice,
      costPrice: varCost,
      barcodeEan13: v.barcodeEan13,
    };
  });

  // Montar galeria de imagens reais (sem URLs falsas do Unsplash)
  const images: string[] = [];
  if (product.coverImageUrl && product.coverImageUrl.trim() !== '') {
    images.push(product.coverImageUrl.trim());
  }

  if (product.mediaGallery && Array.isArray(product.mediaGallery)) {
    product.mediaGallery.forEach((item: any) => {
      const url = typeof item === 'string' ? item : item?.url;
      if (url && typeof url === 'string' && url.trim() !== '' && !images.includes(url.trim())) {
        images.push(url.trim());
      }
    });
  }

  const coverImageUrl = product.coverImageUrl || images[0] || '';

  return {
    id: product.id,
    name: product.title,
    title: product.title,
    masterSku: product.masterSku,
    description: product.description || '',
    price: lowestPrice,
    basePrice: basePriceNum,
    costPrice: costPriceNum,
    sizes: Array.from(sizesSet),
    colors: Array.from(colorsSet),
    stock: totalStock,
    images,
    coverImageUrl,
    category: product.category?.name || 'Geral',
    categoryId: product.categoryId,
    brand: product.brand || 'sagas.moda',
    type: product.type,
    weightGrams: product.weightGrams,
    isActive: product.deletedAt === null,
    variations: formattedVariations,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
