// Seed script for initial data
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...\n');

	// Create admin user
	const hashedPassword = await bcrypt.hash('12345678', 10);
	
	const admin = await prisma.user.upsert({
		where: { email: 'admin' },
		update: {
			password: hashedPassword,
			isAdmin: true,
			isStaff: true,
			isActive: true
		},
		create: {
			email: 'admin',
			password: hashedPassword,
			firstName: 'Admin',
			lastName: 'User',
			isAdmin: true,
			isStaff: true,
			isActive: true
		}
	});

	console.log('✓ Created admin user:', admin.email);
	console.log('  Password: 12345678');

	// Create expense categories
	const categories = await prisma.expenseCategory.createMany({
		data: [
			{ name: 'Аренда', description: 'Аренда помещений и складов' },
			{ name: 'Зарплата', description: 'Заработная плата сотрудников' },
			{ name: 'Закупка товаров', description: 'Закупка автозапчастей' },
			{ name: 'Реклама', description: 'Маркетинг и реклама' },
			{ name: 'Коммунальные услуги', description: 'Электричество, вода, интернет' }
		],
		skipDuplicates: true
	});

	console.log('✓ Created expense categories');

	// Create SEO metadata
	await prisma.seoMetadata.createMany({
		data: [
			{
				page: 'home',
				title: 'GoodDrive - Автозапчасти с доставкой',
				description: 'Интернет-магазин автозапчастей. Большой ассортимент, выгодные цены, быстрая доставка по всей России.',
				keywords: 'автозапчасти, запчасти, автомагазин, доставка запчастей'
			},
			{
				page: 'catalog',
				title: 'Каталог автозапчастей - GoodDrive',
				description: 'Каталог автозапчастей более чем на 100 наименований. Подбор по марке, модели и VIN.',
				keywords: 'каталог запчастей, купить запчасти, автозапчасти онлайн'
			}
		],
		skipDuplicates: true
	});

	console.log('✓ Created SEO metadata');

	// Create brands
	const brands = await Promise.all([
		prisma.brand.upsert({
			where: { name: 'Bosch' },
			update: {},
			create: { name: 'Bosch', country: 'Германия', site: 'https://www.bosch.com' }
		}),
		prisma.brand.upsert({
			where: { name: 'Brembo' },
			update: {},
			create: { name: 'Brembo', country: 'Италия', site: 'https://www.brembo.com' }
		}),
		prisma.brand.upsert({
			where: { name: 'Mann-Filter' },
			update: {},
			create: { name: 'Mann-Filter', country: 'Германия', site: 'https://www.mann-hummel.com' }
		}),
		prisma.brand.upsert({
			where: { name: 'Castrol' },
			update: {},
			create: { name: 'Castrol', country: 'Великобритания', site: 'https://www.castrol.com' }
		}),
		prisma.brand.upsert({
			where: { name: 'NGK' },
			update: {},
			create: { name: 'NGK', country: 'Япония', site: 'https://www.ngk.com' }
		})
	]);

	console.log('✓ Created brands:', brands.length);

	// Create warehouses
	const warehouses = await Promise.all([
		prisma.warehouse.upsert({
			where: { id: 1 },
			update: {},
			create: { name: 'Основной склад Москва', address: 'г. Москва, ул. Складская, д. 1' }
		}),
		prisma.warehouse.upsert({
			where: { id: 2 },
			update: {},
			create: { name: 'Склад Санкт-Петербург', address: 'г. Санкт-Петербург, пр. Складской, д. 5' }
		})
	]);

	console.log('✓ Created warehouses:', warehouses.length);

	// Create sample parts
	const sampleParts = [
		{
			title: 'Тормозные колодки передние',
			label: 'Хит продаж',
			originalNumber: 'BP1234',
			manufacturerNumber: 'BRK-001',
			brandId: brands.find(b => b.name === 'Brembo')?.id || 1,
			warehouseId: warehouses[0].id,
			quantity: 50,
			stock: 50,
			reserve: 5,
			available: 45,
			priceOpt: 3500.00,
			costPrice: 2800.00,
			description: 'Тормозные колодки передние для легковых автомобилей. Высокое качество, долгий срок службы.'
		},
		{
			title: 'Масляный фильтр',
			label: 'Новинка',
			originalNumber: 'OF5678',
			manufacturerNumber: 'W712/73',
			brandId: brands.find(b => b.name === 'Mann-Filter')?.id || 1,
			warehouseId: warehouses[0].id,
			quantity: 100,
			stock: 100,
			reserve: 10,
			available: 90,
			priceOpt: 450.00,
			costPrice: 350.00,
			description: 'Масляный фильтр для двигателей объемом 1.4-2.0л. Оригинальное качество.'
		},
		{
			title: 'Свечи зажигания комплект 4шт',
			originalNumber: 'SP9101',
			manufacturerNumber: 'BCPR6ES-11',
			brandId: brands.find(b => b.name === 'NGK')?.id || 1,
			warehouseId: warehouses[1].id,
			quantity: 75,
			stock: 75,
			reserve: 8,
			available: 67,
			priceOpt: 1200.00,
			costPrice: 950.00,
			description: 'Комплект из 4 свечей зажигания NGK. Подходят для большинства японских автомобилей.'
		},
		{
			title: 'Моторное масло 5W-40 4л',
			label: 'Популярное',
			originalNumber: 'OIL5W40',
			manufacturerNumber: 'EDGE-5W40',
			brandId: brands.find(b => b.name === 'Castrol')?.id || 1,
			warehouseId: warehouses[0].id,
			quantity: 200,
			stock: 200,
			reserve: 20,
			available: 180,
			priceOpt: 2800.00,
			costPrice: 2300.00,
			description: 'Синтетическое моторное масло Castrol EDGE 5W-40. Для бензиновых и дизельных двигателей.'
		},
		{
			title: 'Воздушный фильтр',
			originalNumber: 'AF1122',
			manufacturerNumber: 'C25860',
			brandId: brands.find(b => b.name === 'Mann-Filter')?.id || 1,
			warehouseId: warehouses[1].id,
			quantity: 60,
			stock: 60,
			reserve: 6,
			available: 54,
			priceOpt: 850.00,
			costPrice: 650.00,
			description: 'Воздушный фильтр высокого качества. Эффективная очистка воздуха.'
		}
	];

	for (const part of sampleParts) {
		await prisma.part.upsert({
			where: { id: sampleParts.indexOf(part) + 1 },
			update: {},
			create: part
		});
	}

	console.log('✓ Created sample parts:', sampleParts.length);

	console.log('\n✅ Seeding completed!\n');
	console.log('Login credentials:');
	console.log('  Email: admin');
	console.log('  Password: 12345678');
	console.log('\nTest data:');
	console.log(`  - ${brands.length} brands`);
	console.log(`  - ${warehouses.length} warehouses`);
	console.log(`  - ${sampleParts.length} parts`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

