import { useState, useEffect, useCallback } from 'react';
import { Product, ProductVariation, MarketplaceChannel, ChannelListing } from '../types';
import apiClient, { ApiResponse } from '../services/apiClient';

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
  const defaultListings: Record<MarketplaceChannel, ChannelListing> = {
    APP_SAGAS: {
      id: `lst-app-${dto.id}`,
      channel: 'APP_SAGAS',
      markupPercent: 0,
      channelPrice: dto.price || dto.basePrice || 0,
      status: 'PUBLISHED',
      lastSync: 'Sincronizado via Neon DB',
    },
    SHOPEE: {
      id: `lst-shp-${dto.id}`,
      channel: 'SHOPEE',
      markupPercent: 12,
      channelPrice: Number(((dto.price || dto.basePrice || 0) * 1.12).toFixed(2)),
      status: 'PUBLISHED',
      lastSync: 'Hoje às 10:00',
    },
    MERCADO_LIVRE: {
      id: `lst-ml-${dto.id}`,
      channel: 'MERCADO_LIVRE',
      markupPercent: 15,
      channelPrice: Number(((dto.price || dto.basePrice || 0) * 1.15).toFixed(2)),
      status: 'PUBLISHED',
      lastSync: 'Hoje às 10:00',
    },
    TIKTOK_SHOP: {
      id: `lst-tt-${dto.id}`,
      channel: 'TIKTOK_SHOP',
      markupPercent: 8,
      channelPrice: Number(((dto.price || dto.basePrice || 0) * 1.08).toFixed(2)),
      status: 'DRAFT',
      lastSync: undefined,
    },
  };

  const variations: ProductVariation[] = (dto.variations || []).map((v: any, index: number) => ({
    id: v.id || `var-${index}`,
    size: v.size || 'Único',
    color: v.color || 'Padrão',
    sku: v.sku || `${dto.masterSku}-${index}`,
    barcodeEan13: v.barcodeEan13 || `789${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    stockReal: v.stock ?? v.stockPhysical ?? 0,
    stockReserved: v.stockReserved ?? 0,
    price: v.price || dto.price || 0,
    costPrice: v.costPrice || dto.costPrice || 0,
  }));

  const categoryName = (dto.category || '').toLowerCase();
  const categoryId: 'infantil' | 'feminino' | 'masculino' = 
    categoryName.includes('infant') ? 'infantil' :
    categoryName.includes('masculin') ? 'masculino' : 'feminino';

  return {
    id: dto.id,
    title: dto.title || dto.name || 'Produto Sem Nome',
    masterSku: dto.masterSku || 'SKU-000',
    description: dto.description || '',
    brand: dto.brand || 'sagas.moda',
    basePrice: Number(dto.price || dto.basePrice || 0),
    costPrice: Number(dto.costPrice || 0),
    categoryId,
    categoryLabel: dto.category || (categoryId === 'infantil' ? 'Infantil' : categoryId === 'masculino' ? 'Masculino' : 'Feminino'),
    imageUrl: dto.coverImageUrl || dto.images?.[0] || 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80',
    secondaryImages: dto.images?.slice(1) || [],
    weightGrams: dto.weightGrams || 250,
    dimensionsCm: {
      height: 4.0,
      width: 20.0,
      depth: 25.0,
    },
    fiscal: {
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<ApiResponse<any[]>>('/api/products');
      if (res && res.data) {
        const mapped = res.data.map(mapDtoToAdminProduct);
        setProducts(mapped);
      }
    } catch (err: any) {
      console.error('Erro ao buscar produtos da API do ERP:', err);
      setError(err.message || 'Erro ao carregar produtos do banco.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = async (productData: any): Promise<Product> => {
    const res = await apiClient.post<ApiResponse<any>>('/api/products', productData);
    const newProduct = mapDtoToAdminProduct(res.data);
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = async (id: string, productData: any): Promise<Product> => {
    const res = await apiClient.put<ApiResponse<any>>(`/api/products/${id}`, productData);
    const updated = mapDtoToAdminProduct(res.data);
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    await apiClient.delete(`/api/products/${id}`);
    setProducts(prev => prev.filter(p => p.id !== id));
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
