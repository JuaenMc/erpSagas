import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE' 
      AND table_name != '_prisma_migrations'
    ORDER BY table_name;
  `);

  console.log(`\n========================================`);
  console.log(`📊 TOTAL DE TABELAS CRIADAS NO NEON: ${tables.length}`);
  console.log(`========================================`);
  tables.forEach((t, i) => {
    console.log(`  ${(i + 1).toString().padStart(2, '0')}. ${t.table_name}`);
  });

  const channels = await prisma.channelFeeConfig.findMany();
  console.log(`\n========================================`);
  console.log(`💼 CHANNEL FEE CONFIGS POPULADAS (${channels.length}):`);
  console.log(`========================================`);
  channels.forEach(c => {
    console.log(`  • ${c.channel.padEnd(16)} | ${c.channelLabel.padEnd(30)} | Comissão: ${c.commissionPct}% | Margem Alvo: ${c.targetMarginPct}%`);
  });

  const tenant = await prisma.tenant.findFirst();
  console.log(`\n🏢 TENANT: ${tenant?.name} (${tenant?.slug})`);

  const admin = await prisma.user.findFirst();
  console.log(`👤 ADMIN: ${admin?.fullName} (${admin?.email})`);

  const warehouse = await prisma.warehouse.findFirst();
  console.log(`🏭 DEPÓSITO: ${warehouse?.name} (${warehouse?.code})`);

  const categories = await prisma.category.findMany();
  console.log(`🏷️ CATEGORIAS: ${categories.map(c => c.name).join(', ')}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
