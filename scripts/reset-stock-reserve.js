import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting reserve and recalculating available stock for all parts...');

  const parts = await prisma.part.findMany({
    select: {
      id: true,
      stock: true,
      reserve: true,
      available: true
    }
  });

  console.log(`Found ${parts.length} parts. Updating...`);

  for (const part of parts) {
    const stock = Number(part.stock ?? 0);

    // После очистки заказов считаем, что активного резерва нет
    const reserve = 0;
    const available = Math.max(0, stock - reserve);

    await prisma.part.update({
      where: { id: part.id },
      data: {
        reserve,
        available
      }
    });
  }

  console.log('Stock reserves reset and available quantities recalculated.');
}

main()
  .catch((e) => {
    console.error('Error while resetting stock/reserve:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


