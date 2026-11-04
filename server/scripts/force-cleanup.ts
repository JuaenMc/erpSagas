// server/scripts/force-cleanup.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
  console.error('❌ ERRO CRÍTICO: DATABASE_URL ausente ou apontando para localhost!');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const sanitizedHost = dbUrl.split('@')[1]?.split('/')[0] || 'neon.tech';
  console.log(`🧹 Iniciando limpeza FORÇADA do banco de produção (${sanitizedHost})...`);

  try {
    // 1. Deletar itens de pedidos e dependências de pedidos
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ ${deletedOrderItems.count} itens de pedido (order_items) deletados`);

    await prisma.shipmentPackage.deleteMany({});
    await prisma.returnRequest.deleteMany({});
    await prisma.orderInternalComment.deleteMany({});

    // 2. Deletar pedidos
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ ${deletedOrders.count} pedidos (orders) deletados`);

    // 3. Deletar itens de carrinho e favoritos
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ ${deletedCartItems.count} itens de carrinho (cart_items) deletados`);

    const deletedFavorites = await prisma.favorite.deleteMany({});
    console.log(`✅ ${deletedFavorites.count} favoritos (favorites) deletados`);

    // 4. Deletar movimentações e saldos de estoque (FK ON DELETE RESTRICT para ProductVariation)
    const deletedMovements = await prisma.stockMovement.deleteMany({});
    console.log(`✅ ${deletedMovements.count} movimentações de estoque (stock_movements) deletadas`);

    const deletedStocks = await prisma.warehouseStock.deleteMany({});
    console.log(`✅ ${deletedStocks.count} saldos de estoque (warehouse_stocks) deletados`);

    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.productChannelPricing.deleteMany({});
    await prisma.channelListing.deleteMany({});

    // 5. Deletar variações (ProductVariation)
    const deletedVariations = await prisma.productVariation.deleteMany({});
    console.log(`✅ ${deletedVariations.count} variações deletadas`);

    // 6. Deletar produtos (Product)
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ ${deletedProducts.count} produtos deletados`);

    console.log('🎉 Banco de dados limpo com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro detalhado durante a limpeza forçada:', error?.message || error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro na limpeza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

