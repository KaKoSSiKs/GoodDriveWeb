// Import catalog from db_of_catalog.csv
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function parseCSVLine(line) {
	const values = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ';' && !inQuotes) {
			values.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	values.push(current.trim());
	
	return values;
}

function parsePrice(priceStr) {
	if (!priceStr || priceStr.trim() === '') return 0;
	// Заменяем запятую на точку и парсим
	const cleaned = priceStr.replace(',', '.').replace(/\s/g, '');
	const parsed = parseFloat(cleaned);
	return isNaN(parsed) ? 0 : parsed;
}

function parseIntSafe(value, defaultValue = 0) {
	if (!value || value.trim() === '') return defaultValue;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
}

async function importFromCSV() {
	console.log('🚀 Импорт каталога из db_of_catalog.csv...\n');

	try {
		const csvPath = path.join(__dirname, '../db_of_catalog.csv');
		
		if (!fs.existsSync(csvPath)) {
			console.error('❌ Файл db_of_catalog.csv не найден по пути:', csvPath);
			process.exit(1);
		}

		const fileContent = fs.readFileSync(csvPath, 'utf-8');
		const lines = fileContent.split('\n').filter(l => l.trim());
		
		console.log(`📄 Всего строк в CSV: ${lines.length}\n`);

		// Пропускаем заголовок
		if (lines.length < 2) {
			console.error('❌ CSV файл пуст или содержит только заголовок');
			process.exit(1);
		}

		const stats = {
			brandsCreated: 0,
			brandsUpdated: 0,
			warehousesCreated: 0,
			warehousesUpdated: 0,
			partsCreated: 0,
			partsUpdated: 0,
			partsSkipped: 0,
			errors: 0
		};

		const brandCache = new Map();
		const warehouseCache = new Map();

		// Обрабатываем первые 100 строк (для тестирования)
		const maxRows = 100;
		const rowsToProcess = Math.min(maxRows, lines.length - 1);
		
		console.log(`📦 Будет обработано: ${rowsToProcess} товаров\n`);
		
		for (let i = 1; i <= rowsToProcess; i++) {
			const values = parseCSVLine(lines[i]);
			
			if (values.length < 12) {
				stats.partsSkipped++;
				continue;
			}

			try {
				const title = values[1]?.trim(); // Наименование полное
				if (!title || title === 'False' || title === '') {
					stats.partsSkipped++;
					continue;
				}

				const label = values[2]?.trim() || '';
				const originalNumber = values[3]?.trim() || '';
				const manufacturerNumber = values[4]?.trim() || '';
				const brandName = values[5]?.trim() || 'Неизвестный';
				const warehouseName = values[6]?.trim() || 'Основной склад';
				const quantity = parseIntSafe(values[7], 0);
				const stock = parseIntSafe(values[8], 0);
				const reserve = parseIntSafe(values[9], 0);
				const available = parseIntSafe(values[10], 0);
				const priceOpt = parsePrice(values[11]);

				// Создаем или получаем бренд
				let brand;
				if (brandCache.has(brandName)) {
					brand = brandCache.get(brandName);
				} else {
					brand = await prisma.brand.findFirst({
						where: { name: brandName }
					});

					if (!brand) {
						brand = await prisma.brand.create({
							data: {
								name: brandName,
								country: 'Россия',
								site: null
							}
						});
						stats.brandsCreated++;
					} else {
						stats.brandsUpdated++;
					}
					brandCache.set(brandName, brand);
				}

				// Создаем или получаем склад
				let warehouse;
				if (warehouseCache.has(warehouseName)) {
					warehouse = warehouseCache.get(warehouseName);
				} else {
					warehouse = await prisma.warehouse.findFirst({
						where: { name: warehouseName }
					});

					if (!warehouse) {
						warehouse = await prisma.warehouse.create({
							data: {
								name: warehouseName,
								address: 'Не указан'
							}
						});
						stats.warehousesCreated++;
					} else {
						stats.warehousesUpdated++;
					}
					warehouseCache.set(warehouseName, warehouse);
				}

				// Проверяем, существует ли товар (по оригинальному номеру или названию)
				let existingPart = null;
				if (originalNumber) {
					existingPart = await prisma.part.findFirst({
						where: {
							originalNumber: originalNumber,
							brandId: brand.id
						}
					});
				}

				// Если не нашли по оригинальному номеру, ищем по названию и бренду
				if (!existingPart) {
					existingPart = await prisma.part.findFirst({
						where: {
							title: title,
							brandId: brand.id
						}
					});
				}

				if (existingPart) {
					// Обновляем существующий товар
					await prisma.part.update({
						where: { id: existingPart.id },
						data: {
							title: title,
							label: label || null,
							originalNumber: originalNumber || null,
							manufacturerNumber: manufacturerNumber || null,
							brandId: brand.id,
							warehouseId: warehouse.id,
							quantity: quantity,
							stock: stock,
							reserve: reserve,
							available: available,
							priceOpt: priceOpt,
							isActive: true
						}
					});
					stats.partsUpdated++;
				} else {
					// Создаем новый товар
					const part = await prisma.part.create({
						data: {
							isActive: true,
							title: title,
							label: label || null,
							originalNumber: originalNumber || null,
							manufacturerNumber: manufacturerNumber || null,
							brandId: brand.id,
							warehouseId: warehouse.id,
							quantity: quantity,
							stock: stock,
							reserve: reserve,
							available: available,
							priceOpt: priceOpt,
							costPrice: priceOpt * 0.6, // Себестоимость = 60% от оптовой цены
							description: null
						}
					});

					// Создаем placeholder изображение, если его нет
					const existingImage = await prisma.partImage.findFirst({
						where: { partId: part.id }
					});

					if (!existingImage) {
						await prisma.partImage.create({
							data: {
								partId: part.id,
								imageUrl: 'https://via.placeholder.com/600x600/2563EB/FFFFFF?text=Auto+Part',
								altText: title,
								orderIndex: 0
							}
						});
					}

					stats.partsCreated++;
				}

				// Прогресс
				if (i % 10 === 0) {
					process.stdout.write(`\rОбработано: ${i}/${rowsToProcess} (${Math.round((i / rowsToProcess) * 100)}%)`);
				}

			} catch (error) {
				console.error(`\n❌ Ошибка в строке ${i + 1}:`, error.message);
				stats.errors++;
			}
		}

		console.log('\n\n✅ Импорт завершен!\n');
		console.log('📊 Статистика:');
		console.log(`  Брендов создано: ${stats.brandsCreated}`);
		console.log(`  Брендов найдено: ${stats.brandsUpdated}`);
		console.log(`  Складов создано: ${stats.warehousesCreated}`);
		console.log(`  Складов найдено: ${stats.warehousesUpdated}`);
		console.log(`  Товаров создано: ${stats.partsCreated}`);
		console.log(`  Товаров обновлено: ${stats.partsUpdated}`);
		console.log(`  Товаров пропущено: ${stats.partsSkipped}`);
		console.log(`  Ошибок: ${stats.errors}\n`);

	} catch (error) {
		console.error('❌ Ошибка импорта:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

importFromCSV();

