// Скрипт для проверки количества товаров и добавления тестовых данных
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения из .env файла (если он существует)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
	const envContent = fs.readFileSync(envPath, 'utf-8');
	const envLines = envContent.split(/\r?\n/);
	
	for (const line of envLines) {
		const trimmedLine = line.trim();
		// Пропускаем комментарии и пустые строки
		if (!trimmedLine || trimmedLine.startsWith('#')) continue;
		
		// Парсим KEY=VALUE или KEY="VALUE"
		const match = trimmedLine.match(/^([^=]+)=(.*)$/);
		if (match) {
			const key = match[1].trim();
			let value = match[2].trim();
			
			// Удаляем кавычки если есть
			if ((value.startsWith('"') && value.endsWith('"')) || 
			    (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			
			process.env[key] = value;
		}
	}
}

const prisma = new PrismaClient();

async function checkAndSeedParts() {
  try {
    // Проверяем количество активных товаров
    const count = await prisma.part.count({
      where: { isActive: true }
    });

    console.log(`\n📊 Текущее количество товаров в каталоге: ${count}`);

    if (count >= 100) {
      console.log('✅ В каталоге достаточно товаров (>= 100)');
      return;
    }

    const needed = 100 - count;
    console.log(`\n⚠️  Недостаточно товаров. Нужно добавить: ${needed}`);

    // Получаем бренды и склады
    const brands = await prisma.brand.findMany({ take: 10 });
    const warehouses = await prisma.warehouse.findMany({ take: 5 });

    if (brands.length === 0) {
      console.log('❌ Нет брендов в базе данных. Создаю тестовые бренды...');
      
      // Создаем тестовые бренды
      const testBrands = [
        { name: 'Bosch', country: 'Германия' },
        { name: 'Mann Filter', country: 'Германия' },
        { name: 'Valeo', country: 'Франция' },
        { name: 'NGK', country: 'Япония' },
        { name: 'Denso', country: 'Япония' },
        { name: 'Gates', country: 'США' },
        { name: 'Mahle', country: 'Германия' },
        { name: 'Febi', country: 'Германия' },
        { name: 'TRW', country: 'США' },
        { name: 'Lemforder', country: 'Германия' }
      ];

      for (const brandData of testBrands) {
        await prisma.brand.upsert({
          where: { name: brandData.name },
          update: {},
          create: brandData
        });
      }

      const updatedBrands = await prisma.brand.findMany({ take: 10 });
      brands.push(...updatedBrands);
      console.log('✅ Создано 10 тестовых брендов');
    }

    if (warehouses.length === 0) {
      console.log('❌ Нет складов в базе данных. Создаю тестовые склады...');
      
      // Создаем тестовые склады
      const testWarehouses = [
        { name: 'Основной склад', address: 'г. Челябинск, ул. Артиллерийская, 15к2' },
        { name: 'Склад №2', address: 'г. Челябинск, ул. Промышленная, 10' },
        { name: 'Склад №3', address: 'г. Челябинск, ул. Машиностроителей, 25' }
      ];

      for (const warehouseData of testWarehouses) {
        await prisma.warehouse.create({
          data: warehouseData
        });
      }

      const updatedWarehouses = await prisma.warehouse.findMany({ take: 5 });
      warehouses.push(...updatedWarehouses);
      console.log('✅ Создано 3 тестовых склада');
    }

    // Список тестовых товаров
    const partTemplates = [
      // Фильтры
      { title: 'Масляный фильтр', category: 'Фильтры', basePrice: 350 },
      { title: 'Воздушный фильтр', category: 'Фильтры', basePrice: 450 },
      { title: 'Топливный фильтр', category: 'Фильтры', basePrice: 550 },
      { title: 'Салонный фильтр', category: 'Фильтры', basePrice: 650 },
      
      // Свечи зажигания
      { title: 'Свеча зажигания', category: 'Свечи', basePrice: 250 },
      { title: 'Свеча накаливания', category: 'Свечи', basePrice: 350 },
      
      // Тормозные колодки
      { title: 'Тормозные колодки передние', category: 'Тормоза', basePrice: 1200 },
      { title: 'Тормозные колодки задние', category: 'Тормоза', basePrice: 1000 },
      { title: 'Тормозные диски передние', category: 'Тормоза', basePrice: 2500 },
      { title: 'Тормозные диски задние', category: 'Тормоза', basePrice: 2000 },
      
      // Амортизаторы
      { title: 'Амортизатор передний', category: 'Подвеска', basePrice: 3500 },
      { title: 'Амортизатор задний', category: 'Подвеска', basePrice: 3000 },
      { title: 'Стойка амортизатора', category: 'Подвеска', basePrice: 4500 },
      
      // Ремни и цепи
      { title: 'Ремень ГРМ', category: 'Ремни', basePrice: 1500 },
      { title: 'Ролик натяжителя ГРМ', category: 'Ремни', basePrice: 800 },
      { title: 'Цепь ГРМ', category: 'Цепи', basePrice: 3500 },
      
      // Подшипники
      { title: 'Подшипник ступицы передний', category: 'Подшипники', basePrice: 1200 },
      { title: 'Подшипник ступицы задний', category: 'Подшипники', basePrice: 1000 },
      
      // Лампы
      { title: 'Лампа ближнего света H7', category: 'Освещение', basePrice: 450 },
      { title: 'Лампа дальнего света H1', category: 'Освещение', basePrice: 500 },
      { title: 'Лампа габаритная', category: 'Освещение', basePrice: 150 },
      
      // Жидкости
      { title: 'Моторное масло 5W-30', category: 'Жидкости', basePrice: 1800 },
      { title: 'Тормозная жидкость DOT-4', category: 'Жидкости', basePrice: 450 },
      { title: 'Охлаждающая жидкость', category: 'Жидкости', basePrice: 650 },
      
      // Щетки стеклоочистителя
      { title: 'Щетка стеклоочистителя', category: 'Кузов', basePrice: 600 },
      
      // Катушки зажигания
      { title: 'Катушка зажигания', category: 'Электрика', basePrice: 2500 },
      
      // Датчики
      { title: 'Датчик ABS', category: 'Датчики', basePrice: 1500 },
      { title: 'Датчик кислорода', category: 'Датчики', basePrice: 3500 },
      { title: 'Датчик температуры', category: 'Датчики', basePrice: 800 }
    ];

    console.log(`\n🔄 Создаю ${needed} тестовых товаров...`);

    let created = 0;
    for (let i = 0; i < needed; i++) {
      const template = partTemplates[i % partTemplates.length];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      
      // Генерируем уникальный номер
      const partNumber = `${brand.name.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(6, '0')}`;
      
      // Случайное количество на складе
      const stock = Math.floor(Math.random() * 50) + 10;
      const reserve = Math.floor(Math.random() * 5);
      const available = stock - reserve;
      
      // Цена с небольшими вариациями
      const priceVariation = 0.8 + Math.random() * 0.4; // ±20%
      const priceOpt = Math.round(template.basePrice * priceVariation * 100) / 100;

      try {
        const part = await prisma.part.create({
          data: {
            isActive: true,
            title: `${template.title} ${brand.name}`,
            label: `${template.category} ${brand.name}`,
            originalNumber: partNumber,
            manufacturerNumber: `${brand.name}-${partNumber}`,
            brandId: brand.id,
            warehouseId: warehouse.id,
            quantity: stock,
            stock: stock,
            reserve: reserve,
            available: available,
            priceOpt: priceOpt,
            costPrice: Math.round(priceOpt * 0.6 * 100) / 100, // Себестоимость 60% от цены
            description: `Качественный ${template.title.toLowerCase()} от производителя ${brand.name}. Оригинальный номер: ${partNumber}`
          }
        });

        // Создаем изображение для товара
        const encodedTitle = encodeURIComponent(part.title.substring(0, 30));
        await prisma.partImage.create({
          data: {
            partId: part.id,
            imageUrl: `https://via.placeholder.com/600x600/2563EB/FFFFFF?text=${encodedTitle}`,
            altText: part.title,
            orderIndex: 0
          }
        });

        created++;
        
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`\rСоздано: ${i + 1}/${needed} товаров...`);
        }
      } catch (error) {
        console.error(`\n❌ Ошибка при создании товара ${i + 1}:`, error.message);
      }
    }

    console.log(`\n\n✅ Успешно создано ${created} товаров!`);

    // Проверяем итоговое количество
    const finalCount = await prisma.part.count({
      where: { isActive: true }
    });
    console.log(`\n📊 Итоговое количество товаров в каталоге: ${finalCount}`);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeedParts()
  .then(() => {
    console.log('\n✅ Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });

