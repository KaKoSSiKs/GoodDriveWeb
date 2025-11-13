// Import catalog from db_of_catalog.csv
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
			
			// Устанавливаем переменную окружения
			if (!process.env[key]) {
				process.env[key] = value;
			}
		}
	}
	
	// Если DATABASE_URL указывает на mysql:3306 (для Docker), заменяем на localhost:3306 для локального запуска
	if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('mysql:3306')) {
		process.env.DATABASE_URL = process.env.DATABASE_URL.replace('mysql:3306', 'localhost:3306');
		console.log('📝 DATABASE_URL изменен для локального подключения:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
	}
}

const prisma = new PrismaClient();

/**
 * Парсит строку CSV с учетом кавычек и разделителя ';'
 */
function parseCSVLine(line) {
	const values = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];
		
		// Обработка кавычек
		if (char === '"') {
			// Двойные кавычки экранируют кавычку
			if (nextChar === '"' && inQuotes) {
				current += '"';
				i++; // Пропускаем следующую кавычку
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ';' && !inQuotes) {
			// Разделитель вне кавычек
			values.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	// Добавляем последнее значение
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
	if (!value || (typeof value === 'string' && value.trim() === '')) {
		return defaultValue;
	}
	// Преобразуем в строку, если это не строка
	const strValue = String(value).trim();
	if (strValue === '') return defaultValue;
	const parsed = parseInt(strValue, 10);
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

		// Читаем файл с правильной кодировкой (пробуем UTF-8, если не работает - UTF-8 с BOM)
		let fileContent;
		try {
			fileContent = fs.readFileSync(csvPath, 'utf-8');
		} catch (error) {
			// Если UTF-8 не работает, пробуем другие кодировки
			try {
				fileContent = fs.readFileSync(csvPath, 'utf8');
			} catch (e) {
				console.error('❌ Ошибка чтения файла:', e.message);
				process.exit(1);
			}
		}
		
		// Удаляем BOM если есть
		if (fileContent.charCodeAt(0) === 0xFEFF) {
			fileContent = fileContent.slice(1);
		}
		
		// Разбиваем на строки и фильтруем пустые
		const lines = fileContent.split(/\r?\n/).filter(l => l.trim());
		
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
			
			try {
				// Валидация данных
				if (values.length < 12) {
					console.warn(`⚠️  Строка ${i + 1}: Недостаточно колонок (${values.length} вместо 12)`);
					stats.partsSkipped++;
					continue;
				}

				const title = values[1]?.trim(); // Наименование полное
				if (!title || title === 'False' || title === '' || title.length > 200) {
					if (i <= 5) {
						console.warn(`⚠️  Строка ${i + 1}: Пропущена - некорректное название: "${title}"`);
					}
					stats.partsSkipped++;
					continue;
				}

				const label = (values[2]?.trim() || '').substring(0, 100);
				const originalNumber = (values[3]?.trim() || '').substring(0, 50);
				const manufacturerNumber = (values[4]?.trim() || '').substring(0, 50);
				const brandName = (values[5]?.trim() || 'Неизвестный').substring(0, 100);
				const warehouseName = (values[6]?.trim() || 'Основной склад').substring(0, 200);
				const quantity = Math.max(0, parseIntSafe(values[7], 0));
				const stock = Math.max(0, parseIntSafe(values[8], 0));
				const reserve = Math.max(0, parseIntSafe(values[9], 0));
				const available = Math.max(0, parseIntSafe(values[10], 0));
				const priceOpt = Math.max(0, parsePrice(values[11]));

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
							available: available > 0 ? available : stock - reserve, // Используем доступное или вычисляем
							priceOpt: priceOpt > 0 ? priceOpt : existingPart.priceOpt, // Сохраняем цену если новая = 0
							costPrice: priceOpt > 0 ? priceOpt * 0.6 : existingPart.costPrice,
							isActive: true
						}
					});
					stats.partsUpdated++;
				} else {
					// Вычисляем доступное количество, если оно не указано
					const calculatedAvailable = available > 0 ? available : Math.max(0, stock - reserve);
					
					// Проверяем, что цена больше 0
					if (priceOpt <= 0) {
						console.warn(`⚠️  Строка ${i + 1}: Цена равна 0, пропускаем товар "${title}"`);
						stats.partsSkipped++;
						continue;
					}

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
							available: calculatedAvailable,
							priceOpt: priceOpt,
							costPrice: priceOpt * 0.6, // Себестоимость = 60% от оптовой цены
							description: null
						}
					});

					// Создаем placeholder изображение для товара
					const existingImage = await prisma.partImage.findFirst({
						where: { partId: part.id }
					});

					if (!existingImage) {
						// Создаем placeholder изображение с заголовком товара (URL-encoded)
						const encodedTitle = encodeURIComponent(title.substring(0, 30));
						await prisma.partImage.create({
							data: {
								partId: part.id,
								imageUrl: `https://via.placeholder.com/600x600/2563EB/FFFFFF?text=${encodedTitle}`,
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
				if (error.stack && i <= 5) {
					console.error('Stack:', error.stack);
				}
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

