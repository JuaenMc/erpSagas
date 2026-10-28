import { PrismaClient, RoleType, MarketplaceChannel, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed do SAGAS ERP no Neon PostgreSQL...');

  // 1. Tenant Principal
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sagas-moda' },
    update: {},
    create: {
      id: 'tenant-sagas-principal',
      name: 'Grupo SAGAS Moda Ltda',
      slug: 'sagas-moda',
      plan: 'ENTERPRISE',
    },
  });
  console.log(`✅ Tenant criado/verificado: ${tenant.name} (${tenant.id})`);

  // 2. Company Entity (Filial/Matriz Fiscal)
  const company = await prisma.companyEntity.upsert({
    where: { cnpj: '48.123.456/0001-78' },
    update: {},
    create: {
      id: 'comp-matriz-sp',
      tenantId: tenant.id,
      corporateName: 'Sagas Moda Brasil Confecções e Varejo Ltda',
      tradeName: 'SAGAS Brasil Moda',
      cnpj: '48.123.456/0001-78',
      taxRegime: 'SIMPLES_NACIONAL_ME',
      ie: '123.456.789.110',
      uf: 'SP',
    },
  });
  console.log(`✅ Empresa fiscal criada: ${company.tradeName}`);

  // 3. Usuário Administrador Inicial
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sagas.moda' },
    update: {},
    create: {
      id: 'user-admin-root',
      tenantId: tenant.id,
      email: 'admin@sagas.moda',
      fullName: 'Administrador Sagas',
      role: RoleType.ADMIN,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$init_admin_hash_placeholder',
      permissionsJson: { all: true },
    },
  });
  console.log(`✅ Usuário Admin: ${adminUser.email}`);

  // 4. Depósito Principal (Centro de Distribuição)
  const warehouse = await prisma.warehouse.upsert({
    where: { id: 'wh-cd-sp-main' },
    update: {},
    create: {
      id: 'wh-cd-sp-main',
      tenantId: tenant.id,
      name: 'CD Central São Paulo',
      code: 'CD-SP-01',
      isPhysicalStore: false,
      isQualityQuarantine: false,
    },
  });
  console.log(`✅ Depósito Central: ${warehouse.name} (${warehouse.code})`);

  // 5. Categorias Raiz
  const categories = [
    { id: 'cat-feminino', name: 'Feminino', slug: 'feminino' },
    { id: 'cat-infantil', name: 'Infantil', slug: 'infantil' },
    { id: 'cat-masculino', name: 'Masculino', slug: 'masculino' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        tenantId: tenant.id,
        name: cat.name,
        slug: cat.slug,
      },
    });
  }
  console.log(`✅ ${categories.length} Categorias raiz criadas (Feminino, Infantil, Masculino)`);

  // 6. ChannelFeeConfig (Taxas padrão por Canal Omnichannel)
  const channelConfigs = [
    {
      channel: MarketplaceChannel.APP_SAGAS,
      channelLabel: 'App Mobile SAGAS (D2C)',
      commissionPct: 0.0,
      fixedFeePerItem: 0.0,
      fixedFeeThreshold: 0.0,
      paymentFeePct: 1.99, // Gateway Pix / Cartão (Mercado Pago)
      shippingCostEstimate: 12.0,
      packagingCost: 2.5,
      taxPct: 5.0,
      targetMarginPct: 35.0,
      minFloorMarginPct: 18.0,
    },
    {
      channel: MarketplaceChannel.SHOPEE,
      channelLabel: 'Shopee Brasil',
      commissionPct: 20.0, // Comissão padrão + programa frete grátis
      fixedFeePerItem: 4.0,
      fixedFeeThreshold: null,
      paymentFeePct: 0.0, // Já retido na comissão Shopee
      shippingCostEstimate: 0.0,
      packagingCost: 2.5,
      taxPct: 5.0,
      targetMarginPct: 28.0,
      minFloorMarginPct: 15.0,
    },
    {
      channel: MarketplaceChannel.MERCADO_LIVRE,
      channelLabel: 'Mercado Livre Clássico/Premium',
      commissionPct: 17.0,
      fixedFeePerItem: 6.0,
      fixedFeeThreshold: 79.0, // Acima de 79 isenta taxa fixa
      paymentFeePct: 0.0,
      shippingCostEstimate: 5.0,
      packagingCost: 2.5,
      taxPct: 5.0,
      targetMarginPct: 28.0,
      minFloorMarginPct: 15.0,
    },
    {
      channel: MarketplaceChannel.TIKTOK_SHOP,
      channelLabel: 'TikTok Shop Live Commerce',
      commissionPct: 15.0,
      fixedFeePerItem: 3.5,
      fixedFeeThreshold: null,
      paymentFeePct: 0.0,
      shippingCostEstimate: 0.0,
      packagingCost: 2.5,
      taxPct: 5.0,
      targetMarginPct: 30.0,
      minFloorMarginPct: 16.0,
    },
    {
      channel: MarketplaceChannel.PDV_EVENTOS,
      channelLabel: 'PDV & Eventos Presenciais',
      commissionPct: 0.0,
      fixedFeePerItem: 0.0,
      fixedFeeThreshold: null,
      paymentFeePct: 2.5, // Maquininha física
      shippingCostEstimate: 0.0,
      packagingCost: 1.5,
      taxPct: 5.0,
      targetMarginPct: 40.0,
      minFloorMarginPct: 20.0,
    },
  ];

  for (const cfg of channelConfigs) {
    await prisma.channelFeeConfig.upsert({
      where: {
        tenantId_channel: {
          tenantId: tenant.id,
          channel: cfg.channel,
        },
      },
      update: {
        channelLabel: cfg.channelLabel,
        commissionPct: cfg.commissionPct,
        fixedFeePerItem: cfg.fixedFeePerItem,
        fixedFeeThreshold: cfg.fixedFeeThreshold,
        paymentFeePct: cfg.paymentFeePct,
        shippingCostEstimate: cfg.shippingCostEstimate,
        packagingCost: cfg.packagingCost,
        taxPct: cfg.taxPct,
        targetMarginPct: cfg.targetMarginPct,
        minFloorMarginPct: cfg.minFloorMarginPct,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        channel: cfg.channel,
        channelLabel: cfg.channelLabel,
        commissionPct: cfg.commissionPct,
        fixedFeePerItem: cfg.fixedFeePerItem,
        fixedFeeThreshold: cfg.fixedFeeThreshold,
        paymentFeePct: cfg.paymentFeePct,
        shippingCostEstimate: cfg.shippingCostEstimate,
        packagingCost: cfg.packagingCost,
        taxPct: cfg.taxPct,
        targetMarginPct: cfg.targetMarginPct,
        minFloorMarginPct: cfg.minFloorMarginPct,
        isActive: true,
      },
    });
  }
  // 7. Seed de Produtos de Exemplo (1 Simples, 1 Variável com Grade CoresxTamanhos, 1 Kit)
  console.log('📦 Criando produtos de exemplo com grade e estoque inicial...');

  // 7.1. Produto Simples: Camiseta Básica Algodão Pima
  const prodSimples = await prisma.product.upsert({
    where: {
      tenantId_masterSku: {
        tenantId: tenant.id,
        masterSku: 'BAS-CAM-01',
      },
    },
    update: {},
    create: {
      id: 'prod-cam-basica',
      tenantId: tenant.id,
      title: 'Camiseta Básica Algodão Pima Masculina',
      masterSku: 'BAS-CAM-01',
      description: 'Camiseta gola C clássica em 100% Algodão Pima peruano com toque acetinado e alta respirabilidade.',
      brand: 'sagas.moda',
      categoryId: 'cat-masculino',
      type: ProductType.SIMPLE,
      basePrice: 79.90,
      costPrice: 28.00,
      weightGrams: 200,
      heightCm: 3.0,
      widthCm: 22.0,
      depthCm: 28.0,
      ncm: '6109.10.00',
      cfopDefault: '5102',
      coverImageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      mediaGallery: [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      ],
      aiVisualTags: ['algodao', 'basica', 'masculina', 'pima'],
    },
  });

  const varSimples = await prisma.productVariation.upsert({
    where: { barcodeEan13: '7891000000012' },
    update: {},
    create: {
      id: 'var-cam-basica-uni',
      productId: prodSimples.id,
      sku: 'BAS-CAM-01-UNI-BR',
      barcodeEan13: '7891000000012',
      color: 'Branco Neve',
      size: 'Único',
      priceOverride: null,
      costPriceOverride: null,
    },
  });

  await prisma.warehouseStock.upsert({
    where: {
      warehouseId_variationId: {
        warehouseId: warehouse.id,
        variationId: varSimples.id,
      },
    },
    update: { stockPhysical: 50 },
    create: {
      warehouseId: warehouse.id,
      variationId: varSimples.id,
      stockPhysical: 50,
      safetyStock: 5,
      minStockAlert: 10,
    },
  });

  // 7.2. Produto Variável: Vestido Infantil Floral Verão (Grade Cores x Tamanhos)
  const prodVariavel = await prisma.product.upsert({
    where: {
      tenantId_masterSku: {
        tenantId: tenant.id,
        masterSku: 'VES-FLOR-02',
      },
    },
    update: {},
    create: {
      id: 'prod-vest-infantil',
      tenantId: tenant.id,
      title: 'Vestido Infantil Floral Verão Algodão',
      masterSku: 'VES-FLOR-02',
      description: 'Vestido infantil evasê rodado confeccionado em tricoline 100% algodão hipoalergênico.',
      brand: 'sagas.moda',
      categoryId: 'cat-infantil',
      type: ProductType.VARIABLE,
      basePrice: 89.90,
      costPrice: 32.50,
      weightGrams: 180,
      heightCm: 2.5,
      widthCm: 18.0,
      depthCm: 24.0,
      ncm: '6204.42.00',
      cfopDefault: '5102',
      coverImageUrl: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80',
      mediaGallery: [
        'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=900&q=80',
      ],
      aiVisualTags: ['infantil', 'vestido', 'floral', 'verao'],
    },
  });

  const coresGrade = ['Amarelo Floral', 'Rosê Algodão'];
  const tamanhosGrade = ['2 anos', '4 anos', '6 anos', '8 anos'];
  let eanCounter = 100;

  for (const cor of coresGrade) {
    for (const tam of tamanhosGrade) {
      const sku = `VES-FLOR-${tam.replace(/\s+/g, '')}-${cor.replace(/\s+/g, '')}`.toUpperCase();
      const barcode = `7892000000${eanCounter++}`;

      const varItem = await prisma.productVariation.upsert({
        where: { barcodeEan13: barcode },
        update: {},
        create: {
          productId: prodVariavel.id,
          sku,
          barcodeEan13: barcode,
          color: cor,
          size: tam,
        },
      });

      await prisma.warehouseStock.upsert({
        where: {
          warehouseId_variationId: {
            warehouseId: warehouse.id,
            variationId: varItem.id,
          },
        },
        update: { stockPhysical: 15 },
        create: {
          warehouseId: warehouse.id,
          variationId: varItem.id,
          stockPhysical: 15,
          safetyStock: 5,
          minStockAlert: 10,
        },
      });
    }
  }

  // 7.3. Kit Fixo: Kit 3 Peças Mãe & Filha
  const prodKit = await prisma.product.upsert({
    where: {
      tenantId_masterSku: {
        tenantId: tenant.id,
        masterSku: 'KIT-VERAO-03',
      },
    },
    update: {},
    create: {
      id: 'prod-kit-mae-filha',
      tenantId: tenant.id,
      title: 'Kit 3 Peças Look Tal Mãe Tal Filha',
      masterSku: 'KIT-VERAO-03',
      description: 'Combo exclusivo composto por 1 Vestido Adulto Midi + 1 Vestido Infantil Rodado + 1 Tiara laço.',
      brand: 'sagas.moda',
      categoryId: 'cat-feminino',
      type: ProductType.FIXED_KIT,
      basePrice: 199.90,
      costPrice: 72.00,
      weightGrams: 550,
      heightCm: 6.0,
      widthCm: 25.0,
      depthCm: 32.0,
      ncm: '6204.42.00',
      cfopDefault: '5102',
      coverImageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80',
      mediaGallery: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80',
      ],
      aiVisualTags: ['kit', 'combo', 'mae-e-filha', 'feminino'],
    },
  });

  const kitVariations = [
    { size: 'P / 2 anos', color: 'Terracota Floral', sku: 'KIT-MF-P2A', barcode: '7893000000001', stock: 25 },
    { size: 'M / 4 anos', color: 'Terracota Floral', sku: 'KIT-MF-M4A', barcode: '7893000000002', stock: 25 },
  ];

  for (const kv of kitVariations) {
    const varKit = await prisma.productVariation.upsert({
      where: { barcodeEan13: kv.barcode },
      update: {},
      create: {
        productId: prodKit.id,
        sku: kv.sku,
        barcodeEan13: kv.barcode,
        color: kv.color,
        size: kv.size,
      },
    });

    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_variationId: {
          warehouseId: warehouse.id,
          variationId: varKit.id,
        },
      },
      update: { stockPhysical: kv.stock },
      create: {
        warehouseId: warehouse.id,
        variationId: varKit.id,
        stockPhysical: kv.stock,
        safetyStock: 5,
        minStockAlert: 10,
      },
    });
  }

  console.log(`✅ 3 Produtos de exemplo (Simples, Grade 8 Variações, Kit) populados com estoque no CD-SP-01!`);

  // 10. Cupons Oficiais da Loja SAGAS
  const defaultCoupons = [
    {
      code: 'BEMVINDA10',
      type: 'PERCENTAGE',
      value: 10,
      minPurchase: 50,
      validUntil: new Date('2028-12-31T23:59:59Z'),
      isActive: true,
    },
    {
      code: 'SAGAS15',
      type: 'PERCENTAGE',
      value: 15,
      minPurchase: 100,
      validUntil: new Date('2028-12-31T23:59:59Z'),
      isActive: true,
    },
    {
      code: 'BEMVINDA',
      type: 'FIXED',
      value: 15,
      minPurchase: 80,
      validUntil: new Date('2028-12-31T23:59:59Z'),
      isActive: true,
    },
    {
      code: 'VIP20',
      type: 'PERCENTAGE',
      value: 20,
      minPurchase: 150,
      validUntil: new Date('2028-12-31T23:59:59Z'),
      isActive: true,
    },
  ];

  for (const cupom of defaultCoupons) {
    await prisma.coupon.upsert({
      where: { code: cupom.code },
      update: {
        type: cupom.type,
        value: cupom.value,
        minPurchase: cupom.minPurchase,
        validUntil: cupom.validUntil,
        isActive: cupom.isActive,
      },
      create: {
        code: cupom.code,
        type: cupom.type,
        value: cupom.value,
        minPurchase: cupom.minPurchase,
        validUntil: cupom.validUntil,
        isActive: cupom.isActive,
      },
    });
  }
  console.log(`✅ ${defaultCoupons.length} Cupons cadastrados no Neon DB (BEMVINDA10, SAGAS15, BEMVINDA, VIP20)`);

  console.log('🎉 Seed concluído com êxito no Neon PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
