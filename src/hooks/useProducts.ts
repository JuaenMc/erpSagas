import { useState, useEffect, useCallback } from 'react';
import { Product, ProductVariation, MarketplaceChannel, ChannelListing } from '../types';
import apiClient, { ApiResponse } from '../services/apiClient';
import { profitCalculatorService } from '../services/ProfitCalculatorService';

export interface UseProductsReturn {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProduct: (productData: any) => Promise<Product>;
  updateProduct: (id: string, productData: any) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
}

// Adaptador: Transforma o StoreProductDto retornado pelo backend na interface Product do Admin
export function mapDtoToAdminProduct(dto: any): Product {
  const basePriceNum = Number(dto.price ?? dto.basePrice ?? 49.9);
  const costPriceNum = Number(dto.costPrice ?? basePriceNum * 0.4);

  const defaultListings: Record<MarketplaceChannel, ChannelListing> = {
    APP_SAGAS: {
      id: `lst-app-${dto.id}`,
      channel: 'APP_SAGAS',
      markupPercent: 0,
      channelPrice: basePriceNum,
      status: 'PUBLISHED',
      lastSync: 'Sincronizado',
    },
    SHOPEE: {
      id: `lst-shp-${dto.id}`,
      channel: 'SHOPEE',
      markupPercent: 12,
      channelPrice: Number((basePriceNum * 1.12).toFixed(2)),
      status: 'PUBLISHED',
      lastSync: 'Hoje às 10:00',
    },
    MERCADO_LIVRE: {
      id: `lst-ml-${dto.id}`,
      channel: 'MERCADO_LIVRE',
      markupPercent: 15,
      channelPrice: Number((basePriceNum * 1.15).toFixed(2)),
      status: 'PUBLISHED',
      lastSync: 'Hoje às 10:00',
    },
    TIKTOK_SHOP: {
      id: `lst-tt-${dto.id}`,
      channel: 'TIKTOK_SHOP',
      markupPercent: 8,
      channelPrice: Number((basePriceNum * 1.08).toFixed(2)),
      status: 'DRAFT',
      lastSync: undefined,
    },
  };

  const variations: ProductVariation[] = (dto.variations || []).map((v: any, index: number) => ({
    id: v.id || `var-${Date.now()}-${index}`,
    size: v.size || 'Único',
    color: v.color || 'Padrão',
    sku: v.sku || `${dto.masterSku || 'SKU'}-${index + 1}`,
    barcodeEan13:
      v.barcodeEan13 || `789${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    stockReal: Number(v.stock ?? v.stockReal ?? v.stockPhysical ?? 0),
    stockReserved: Number(v.stockReserved ?? 0),
    price: Number(v.price ?? basePriceNum),
    costPrice: Number(v.costPrice ?? costPriceNum),
  }));

  const categoryName = (dto.category || dto.categoryId || '').toLowerCase();
  const categoryId: 'infantil' | 'feminino' | 'masculino' = categoryName.includes('infant')
    ? 'infantil'
    : categoryName.includes('masculin')
    ? 'masculino'
    : 'feminino';

  return {
    id: dto.id || `prod-${Date.now()}`,
    title: dto.title || dto.name || 'Produto Sem Nome',
    masterSku: dto.masterSku || 'SKU-000',
    description: dto.description || '',
    brand: dto.brand || 'sagas.moda',
    basePrice: basePriceNum,
    costPrice: costPriceNum,
    categoryId,
    categoryLabel:
      dto.categoryLabel ||
      dto.category ||
      (categoryId === 'infantil'
        ? 'Infantil'
        : categoryId === 'masculino'
        ? 'Masculino'
        : 'Feminino'),
    imageUrl:
      dto.coverImageUrl ||
      dto.imageUrl ||
      dto.images?.[0] ||
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80',
    secondaryImages: dto.mediaGallery || dto.secondaryImages || dto.images?.slice(1) || [],
    weightGrams: Number(dto.weightGrams || 250),
    dimensionsCm: dto.dimensionsCm || {
      height: 4.0,
      width: 20.0,
      depth: 25.0,
    },
    fiscal: dto.fiscal || {
      ncm: '6104.42.00',
      origem: 0,
      icmsCst: '102',
    },
    tags: dto.tags || ['sagas', categoryId],
    variations,
    channelListings: dto.channelListings || defaultListings,
    createdAt: dto.createdAt || new Date().toISOString(),
  };
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profitCalculatorService.syncProducts(products);
  }, [products]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<ApiResponse<any[]>>('/api/products');
      if (res && Array.isArray(res.data)) {
        const mapped = res.data.map(mapDtoToAdminProduct);
        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = async (productData: any): Promise<Product> => {
    const res = await apiClient.post<ApiResponse<any>>('/api/products', productData);
    if (res && res.data) {
      const newProduct = mapDtoToAdminProduct(res.data);
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    }
    throw new Error('Falha ao criar produto no banco de dados');
  };

  const updateProduct = async (id: string, productData: any): Promise<Product> => {
    const res = await apiClient.put<ApiResponse<any>>(`/api/products/${id}`, productData);
    if (res && res.data) {
      const updated = mapDtoToAdminProduct(res.data);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    }
    throw new Error('Falha ao atualizar produto no banco de dados');
  };

  const deleteProduct = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    products,
    setProducts,
    loading,
    error,
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

export default useProducts;
