import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing orders, order items, status history and related cash transactions...');

  // Удаляем историю статусов заказов
  await prisma.orderStatusHistory.deleteMany({});

  // Удаляем позиции заказов
  await prisma.orderItem.deleteMany({});

  // Удаляем кассовые транзакции, привязанные к заказам
  await prisma.cashTransaction.deleteMany({
    where: {
      orderId: {
        not: null
      }
    }
  });

  // Удаляем сами заказы
  await prisma.order.deleteMany({});

  console.log('Orders data cleared successfully.');
}

main()
  .catch((e) => {
    console.error('Error while clearing orders data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


