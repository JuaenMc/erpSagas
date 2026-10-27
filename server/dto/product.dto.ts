import { Product, ProductVariation, WarehouseStock, Category } from '@prisma/client';

export interface StoreProductVariationDto {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  price: number;
  barcodeEan13: string;
}

export interface StoreProductDto {
  id: string;
  name: string;
  title?: string;
  masterSku: string;
  description: string;
  price: number;
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
  variations: StoreProductVariationDto[];
  published: boolean;
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
  let lowestPrice = Number(product.basePrice);

  const formattedVariations: StoreProductVariationDto[] = variations
    .filter(v => !v.deletedAt)
    .map(v => {
      if (v.size) sizesSet.add(v.size);
      if (v.color) colorsSet.add(v.color);

      // Calcular estoque físico disponível da variação
      const varStock = (v.stocks || []).reduce((acc, s) => {
        const available = Math.max(0, s.stockPhysical - s.stockReservedOrder - s.stockReservedPromo);
        return acc + available;
      }, 0);

      totalStock += varStock;

      const varPrice = v.priceOverride ? Number(v.priceOverride) : Number(product.basePrice);
      if (varPrice < lowestPrice) {
        lowestPrice = varPrice;
      }

      return {
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: varStock,
        price: varPrice,
        barcodeEan13: v.barcodeEan13,
      };
    });

  // Montar galeria de imagens
  const images: string[] = [];
  if (product.coverImageUrl) {
    images.push(product.coverImageUrl);
  }

  if (product.mediaGallery && Array.isArray(product.mediaGallery)) {
    product.mediaGallery.forEach((item: any) => {
      const url = typeof item === 'string' ? item : item?.url;
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }

  return {
    id: product.id,
    name: product.title,
    title: product.title,
    masterSku: product.masterSku,
    description: product.description || '',
    price: lowestPrice,
    costPrice: Number(product.costPrice || 0),
    sizes: Array.from(sizesSet),
    colors: Array.from(colorsSet),
    stock: totalStock,
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80'],
    coverImageUrl: product.coverImageUrl || images[0] || '',
    category: product.category?.name || 'Geral',
    categoryId: product.categoryId,
    brand: product.brand || 'sagas.moda',
    type: product.type,
    weightGrams: product.weightGrams,
    variations: formattedVariations,
    published: !product.deletedAt,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
