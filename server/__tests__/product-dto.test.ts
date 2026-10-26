import { describe, it, expect } from 'vitest';
import { toStoreProductDto } from '../dto/product.dto';

describe('Product DTO Mapper (toStoreProductDto)', () => {
  const baseDate = new Date('2026-10-25T12:00:00Z');

  it('deve mapear corretamente um produto simples (SIMPLE)', () => {
    const simpleProduct: any = {
      id: 'prod-simple-01',
      tenantId: 'tenant-01',
      categoryId: 'cat-vestidos',
      title: 'Vestido Canelado Básico',
      masterSku: 'VEST-CANEL-01',
      description: 'Vestido midi canelado em algodão',
      basePrice: 89.9,
      costPrice: 32.0,
      type: 'SIMPLE',
      weightGrams: 200,
      brand: 'sagas.moda',
      coverImageUrl: 'https://images.unsplash.com/photo-simple',
      mediaGallery: ['https://images.unsplash.com/photo-simple-2'],
      category: { id: 'cat-vestidos', name: 'Vestidos' },
      variations: [],
      createdAt: baseDate,
      updatedAt: baseDate,
    };

    const dto = toStoreProductDto(simpleProduct);

    expect(dto.id).toBe('prod-simple-01');
    expect(dto.name).toBe('Vestido Canelado Básico');
    expect(dto.title).toBe('Vestido Canelado Básico');
    expect(dto.masterSku).toBe('VEST-CANEL-01');
    expect(dto.price).toBe(89.9);
    expect(dto.costPrice).toBe(32.0);
    expect(dto.category).toBe('Vestidos');
    expect(dto.type).toBe('SIMPLE');
    expect(dto.brand).toBe('sagas.moda');
    expect(dto.stock).toBe(0);
    expect(dto.sizes).toEqual([]);
    expect(dto.colors).toEqual([]);
    expect(Array.isArray(dto.variations)).toBe(true);
    expect(dto.variations).toHaveLength(0);
    expect(dto.images).toContain('https://images.unsplash.com/photo-simple');
    expect(dto.images).toContain('https://images.unsplash.com/photo-simple-2');
  });

  it('deve garantir que variations seja sempre array (nunca string nem nulo)', () => {
    const rawProductWithNullVariations: any = {
      id: 'prod-null-var',
      tenantId: 'tenant-01',
      categoryId: 'cat-geral',
      title: 'Saia Midi',
      masterSku: 'SAIA-MIDI-01',
      basePrice: 79.9,
      costPrice: 28.0,
      type: 'VARIABLE',
      weightGrams: 180,
      variations: null, // Resiliência contra null/undefined
      createdAt: baseDate,
      updatedAt: baseDate,
    };

    const dto = toStoreProductDto(rawProductWithNullVariations);

    expect(Array.isArray(dto.variations)).toBe(true);
    expect(dto.variations).toEqual([]);
    expect(typeof dto.variations).toBe('object');
    expect(typeof dto.variations).not.toBe('string');
  });

  it('deve mapear produto com variações (VARIABLE), calculando estoque disponível real e menor preço', () => {
    const variableProduct: any = {
      id: 'prod-var-01',
      tenantId: 'tenant-01',
      categoryId: 'cat-conjuntos',
      title: 'Conjunto Alfaiataria Chic',
      masterSku: 'CONJ-ALF-01',
      basePrice: 159.9,
      costPrice: 65.0,
      type: 'VARIABLE',
      weightGrams: 450,
      coverImageUrl: 'https://images.unsplash.com/photo-conjunto',
      mediaGallery: [],
      category: { id: 'cat-conjuntos', name: 'Conjuntos' },
      createdAt: baseDate,
      updatedAt: baseDate,
      variations: [
        {
          id: 'var-p-preto',
          sku: 'CONJ-ALF-01-P-PRETO',
          size: 'P',
          color: 'Preto',
          barcodeEan13: '7890001',
          priceOverride: 149.9, // Promoção no P
          deletedAt: null,
          stocks: [
            {
              warehouseId: 'cd-sp-01',
              stockPhysical: 10,
              stockReservedOrder: 2,
              stockReservedPromo: 1,
            },
          ],
        },
        {
          id: 'var-m-preto',
          sku: 'CONJ-ALF-01-M-PRETO',
          size: 'M',
          color: 'Preto',
          barcodeEan13: '7890002',
          priceOverride: null, // Usa basePrice (159.90)
          deletedAt: null,
          stocks: [
            {
              warehouseId: 'cd-sp-01',
              stockPhysical: 20,
              stockReservedOrder: 5,
              stockReservedPromo: 0,
            },
          ],
        },
        {
          id: 'var-g-offwhite',
          sku: 'CONJ-ALF-01-G-OFF',
          size: 'G',
          color: 'Off-White',
          barcodeEan13: '7890003',
          priceOverride: 169.9,
          deletedAt: null,
          stocks: [
            {
              warehouseId: 'cd-sp-01',
              stockPhysical: 5,
              stockReservedOrder: 0,
              stockReservedPromo: 0,
            },
          ],
        },
        {
          id: 'var-deleted',
          sku: 'CONJ-DELETED',
          size: 'GG',
          color: 'Preto',
          barcodeEan13: '7890004',
          deletedAt: new Date(), // Soft deleted: deve ser ignorado
          stocks: [{ stockPhysical: 50, stockReservedOrder: 0, stockReservedPromo: 0 }],
        },
      ],
    };

    const dto = toStoreProductDto(variableProduct);

    // Variação 1: 10 - 2 - 1 = 7 disp, R$ 149.90
    // Variação 2: 20 - 5 - 0 = 15 disp, R$ 159.90
    // Variação 3: 5 - 0 - 0 = 5 disp, R$ 169.90
    // Total estoque disponível = 7 + 15 + 5 = 27
    expect(dto.stock).toBe(27);
    expect(dto.price).toBe(149.9); // Menor preço entre as variações ativas
    expect(dto.sizes).toEqual(['P', 'M', 'G']);
    expect(dto.colors).toEqual(['Preto', 'Off-White']);
    expect(dto.variations).toHaveLength(3); // Soft deleted foi descartada

    const pVar = dto.variations.find(v => v.size === 'P');
    expect(pVar).toBeDefined();
    expect(pVar?.stock).toBe(7);
    expect(pVar?.price).toBe(149.9);
  });

  it('deve mapear corretamente produto tipo KIT / COMBO (FIXED_KIT)', () => {
    const kitProduct: any = {
      id: 'prod-kit-01',
      tenantId: 'tenant-01',
      categoryId: 'cat-combos',
      title: 'Kit 3 Blusas Básicas Algodão',
      masterSku: 'KIT-3BLUSAS',
      basePrice: 119.9,
      costPrice: 45.0,
      type: 'FIXED_KIT',
      weightGrams: 350,
      category: { id: 'cat-combos', name: 'Kits & Combos' },
      variations: [],
      createdAt: baseDate,
      updatedAt: baseDate,
    };

    const dto = toStoreProductDto(kitProduct);

    expect(dto.type).toBe('FIXED_KIT');
    expect(dto.name).toBe('Kit 3 Blusas Básicas Algodão');
    expect(dto.price).toBe(119.9);
    expect(dto.costPrice).toBe(45.0);
    expect(Array.isArray(dto.variations)).toBe(true);
  });
});
