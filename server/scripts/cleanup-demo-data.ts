import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL ausente ou apontando para localhost! Configure a string do Neon PostgreSQL de PRODUÇÃO.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

/**
 * Lista explícita de IDs e SKUs dos produtos de demonstração/seed/teste
 * para garantir que NUNCA seja utilizado um deleteMany({}) genérico sem filtro.
 */
const DEMO_PRODUCT_IDS = [
  'prod-cam-basica',
  'prod-vest-infantil',
  'prod-kit-mae-filha',
  '1263955f-24cd-44c3-aa7d-8952c484b676',
];

const DEMO_PRODUCT_MASTER_SKUS = [
  'BAS-CAM-01',
  'VES-FLOR-02',
  'KIT-VERAO-03',
  'BLU-TRI-04',
];

const DEMO_EXTERNAL_ORDER_PREFIXES = [
  'test-',
  'race-',
  'fase4-test-',
  'mobile-app-e2e-',
  'demo-',
];

async function promptConfirmation(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function main() {
  try {
    const sanitizedHost = dbUrl.split('@')[1]?.split('/')[0] || 'neon.tech';
    console.log(`🌐 Conectado ao banco de PRODUÇÃO Neon: ${sanitizedHost}`);
    console.log('🔍 Analisando registros de demonstração/teste no banco Neon PostgreSQL...\n');

    // 1. Filtro seguro e explícito para produtos de demonstração
    const productWhere: Prisma.ProductWhereInput = {
      OR: [
        { id: { in: DEMO_PRODUCT_IDS } },
        { masterSku: { in: DEMO_PRODUCT_MASTER_SKUS } },
        { masterSku: { startsWith: 'DEMO-' } },
        { title: { contains: '[TESTE]', mode: 'insensitive' } },
      ],
    };

    const demoProducts = await prisma.product.findMany({
      where: productWhere,
      select: { id: true, masterSku: true, title: true },
    });
    const targetProductIds = demoProducts.map((p) => p.id);

    // 2. Localizar variações vinculadas aos produtos de demonstração
    const variationWhere: Prisma.ProductVariationWhereInput = {
      OR: [
        { productId: { in: targetProductIds } },
        { sku: { startsWith: 'DEMO-' } },
      ],
    };

    const demoVariations = await prisma.productVariation.findMany({
      where: variationWhere,
      select: { id: true, sku: true },
    });
    const targetVariationIds = demoVariations.map((v) => v.id);

    // 3. Localizar pedidos de teste (por prefixo de teste ou que contenham itens de variações demo)
    const orderWhere: Prisma.OrderWhereInput = {
      OR: [
        ...DEMO_EXTERNAL_ORDER_PREFIXES.map((prefix) => ({
          externalOrderId: { startsWith: prefix },
        })),
        { items: { some: { variationId: { in: targetVariationIds } } } },
      ],
    };

    const demoOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true, orderNumber: true, externalOrderId: true },
    });
    const targetOrderIds = demoOrders.map((o) => o.id);

    // 4. Filtros seguros para cada tabela relacionada
    const orderItemWhere: Prisma.OrderItemWhereInput = {
      OR: [
        { orderId: { in: targetOrderIds } },
        { variationId: { in: targetVariationIds } },
      ],
    };

    const cartItemWhere: Prisma.CartItemWhereInput = {
      OR: [
        { productId: { in: targetProductIds } },
        { variationId: { in: targetVariationIds } },
      ],
    };

    const favoriteWhere: Prisma.FavoriteWhereInput = {
      productId: { in: targetProductIds },
    };

    const warehouseStocks = await prisma.warehouseStock.findMany({
      where: { variationId: { in: targetVariationIds } },
      select: { id: true },
    });
    const targetWarehouseStockIds = warehouseStocks.map((ws) => ws.id);

    // 5. Contagem prévia de todos os registros que serão afetados
    const [
      productsCount,
      variationsCount,
      ordersCount,
      orderItemsCount,
      cartItemsCount,
      favoritesCount,
      stocksCount,
      stockMovementsCount,
    ] = await Promise.all([
      prisma.product.count({ where: { id: { in: targetProductIds } } }),
      prisma.productVariation.count({ where: { id: { in: targetVariationIds } } }),
      prisma.order.count({ where: { id: { in: targetOrderIds } } }),
      prisma.orderItem.count({ where: orderItemWhere }),
      prisma.cartItem.count({ where: cartItemWhere }),
      prisma.favorite.count({ where: favoriteWhere }),
      prisma.warehouseStock.count({ where: { id: { in: targetWarehouseStockIds } } }),
      prisma.stockMovement.count({ where: { warehouseStockId: { in: targetWarehouseStockIds } } }),
    ]);

    console.log('📊 RESUMO DOS DADOS DE DEMONSTRAÇÃO IDENTIFICADOS:');
    console.log(`   • Produtos (products):            ${productsCount}`);
    console.log(`   • Variações (variations):         ${variationsCount}`);
    console.log(`   • Pedidos de teste (orders):      ${ordersCount}`);
    console.log(`   • Itens de pedidos (order_items): ${orderItemsCount}`);
    console.log(`   • Carrinhos (cart_items):         ${cartItemsCount}`);
    console.log(`   • Favoritos (favorites):          ${favoritesCount}`);
    console.log(`   • Saldos de estoque (stocks):     ${stocksCount}`);
    console.log(`   • Movimentações (movements):      ${stockMovementsCount}\n`);

    console.log(
      `⚠️ ATENÇÃO: Você está prestes a apagar ${productsCount} produtos, ${ordersCount} pedidos e ${orderItemsCount} itens.`
    );

    if (
      productsCount === 0 &&
      ordersCount === 0 &&
      orderItemsCount === 0 &&
      cartItemsCount === 0 &&
      favoritesCount === 0 &&
      variationsCount === 0
    ) {
      console.log('✅ Nenhum dado de demonstração encontrado para remoção. O banco já está limpo!');
      return;
    }

    const confirmation = await promptConfirmation("Digite 'SIM' para confirmar a limpeza: ");

    if (confirmation !== 'SIM') {
      console.log('❌ Operação cancelada pelo usuário. Nenhum registro foi apagado.');
      process.exit(0);
    }

    console.log('\n🧹 Executando limpeza transacional respeitando Foreign Keys...');

    const result = await prisma.$transaction(async (tx) => {
      // 1. order_items (itens de pedidos)
      const deletedOrderItems = await tx.orderItem.deleteMany({
        where: orderItemWhere,
      });

      // Dependências auxiliares de pedidos (se existirem)
      if (targetOrderIds.length > 0) {
        await tx.shipmentPackage.deleteMany({
          where: { orderId: { in: targetOrderIds } },
        });
        await tx.returnRequest.deleteMany({
          where: { orderId: { in: targetOrderIds } },
        });
        await tx.orderInternalComment.deleteMany({
          where: { orderId: { in: targetOrderIds } },
        });
      }

      // 2. orders (pedidos de teste)
      const deletedOrders = await tx.order.deleteMany({
        where: { id: { in: targetOrderIds } },
      });

      // 3. cart_items (carrinhos abandonados/mock)
      const deletedCartItems = await tx.cartItem.deleteMany({
        where: cartItemWhere,
      });

      // 4. favorites (favoritos de teste)
      const deletedFavorites = await tx.favorite.deleteMany({
        where: favoriteWhere,
      });

      // Limpeza de movimentações e saldos de estoque das variações demo (FK ON DELETE RESTRICT)
      const deletedMovements = await tx.stockMovement.deleteMany({
        where: { warehouseStockId: { in: targetWarehouseStockIds } },
      });

      const deletedStocks = await tx.warehouseStock.deleteMany({
        where: { id: { in: targetWarehouseStockIds } },
      });

      // Limpeza de precificações e listagens de canal vinculadas aos produtos demo
      if (targetProductIds.length > 0) {
        await tx.productChannelPricing.deleteMany({
          where: { productId: { in: targetProductIds } },
        });
        await tx.channelListing.deleteMany({
          where: { productId: { in: targetProductIds } },
        });
      }

      // 5 & 6. variations e products (variações possuem FK ON DELETE RESTRICT apontando para Product)
      const deletedVariations = await tx.productVariation.deleteMany({
        where: { id: { in: targetVariationIds } },
      });

      const deletedProducts = await tx.product.deleteMany({
        where: { id: { in: targetProductIds } },
      });

      return {
        orderItems: deletedOrderItems.count,
        orders: deletedOrders.count,
        cartItems: deletedCartItems.count,
        favorites: deletedFavorites.count,
        stockMovements: deletedMovements.count,
        warehouseStocks: deletedStocks.count,
        variations: deletedVariations.count,
        products: deletedProducts.count,
      };
    });

    console.log('\n✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('--------------------------------------------------');
    console.log(`🗑️  1. order_items apagados:      ${result.orderItems}`);
    console.log(`🗑️  2. orders apagados:           ${result.orders}`);
    console.log(`🗑️  3. cart_items apagados:       ${result.cartItems}`);
    console.log(`🗑️  4. favorites apagados:        ${result.favorites}`);
    console.log(`🗑️  5. products apagados:         ${result.products}`);
    console.log(`🗑️  6. variations apagadas:       ${result.variations}`);
    console.log(`🗑️  (+) warehouse_stocks apagados: ${result.warehouseStocks}`);
    console.log(`🗑️  (+) stock_movements apagados:  ${result.stockMovements}`);
    console.log('--------------------------------------------------');

    // Verificação pós-limpeza de integridade das tabelas administrativas
    const [remainingUsers, remainingCoupons, remainingAddresses, remainingCategories] =
      await Promise.all([
        prisma.user.count(),
        prisma.coupon.count(),
        prisma.address.count(),
        prisma.category.count(),
      ]);

    console.log('\n🛡️  DADOS ADMINISTRATIVOS PRESERVADOS:');
    console.log(`   • Usuários (users):       ${remainingUsers}`);
    console.log(`   • Cupons (coupons):       ${remainingCoupons}`);
    console.log(`   • Endereços (addresses):  ${remainingAddresses}`);
    console.log(`   • Categorias (categories): ${remainingCategories}`);
  } catch (error: any) {
    console.error('❌ Erro detalhado ao executar limpeza de dados demo:', error?.message || error);
    if (error?.code) {
      console.error(`   Código Prisma: ${error.code} | Meta: ${JSON.stringify(error.meta || {})}`);
    }
    process.exit(1);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
