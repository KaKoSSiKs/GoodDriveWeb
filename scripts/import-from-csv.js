// Import data from CSV to MySQL
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

async function importFromCSV() {
	console.log('🚀 Importing from parts.csv...\n');

	try {
		const csvPath = path.join(__dirname, '../../backend/parts.csv');
		
		if (!fs.existsSync(csvPath)) {
			console.error('❌ parts.csv not found at:', csvPath);
			process.exit(1);
		}

		const fileContent = fs.readFileSync(csvPath, 'utf-8');
		const lines = fileContent.split('\n').filter(l => l.trim());
		
		console.log(`📄 Total lines in CSV: ${lines.length}`);
		
		// Parse header
		const headers = parseCSVLine(lines[0]);
		console.log('📋 Headers:', headers.slice(0, 5).join(', '), '...\n');

		const limit = 100;
		let brandsCreated = 0;
		let warehousesCreated = 0;
		let partsCreated = 0;
		let imagesCreated = 0;

		// Process first 100 rows
		for (let i = 1; i <= Math.min(limit, lines.length - 1); i++) {
			const values = parseCSVLine(lines[i]);
			
			if (values.length < 12) continue;

			try {
				const title = values[1]; // Наименование полное
				if (!title || title === 'False') continue;

				const brandName = values[5] || 'Неизвестный'; // Фирма производитель
				const warehouseName = values[6] || 'Основной склад'; // Склад / раздел
				const stock = parseInt(values[8]) || 0; // Остаток
				const priceStr = values[11] || '0'; // опт интернет
				const price = parseFloat(priceStr.replace(',', '.')) || 0;

				// Create or get brand
				let brand = await prisma.brand.findFirst({
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
					brandsCreated++;
				}

				// Create or get warehouse
				let warehouse = await prisma.warehouse.findFirst({
					where: { name: warehouseName }
				});

				if (!warehouse) {
					warehouse = await prisma.warehouse.create({
						data: {
							name: warehouseName,
							address: 'Не указан'
						}
					});
					warehousesCreated++;
				}

				// Create part
				const part = await prisma.part.create({
					data: {
						isActive: true,
						title: title,
						label: values[2] || '',
						originalNumber: values[3] || '',
						manufacturerNumber: values[4] || '',
						brandId: brand.id,
						warehouseId: warehouse.id,
						quantity: stock,
						stock: stock,
						reserve: 0,
						available: stock,
						priceOpt: price,
						costPrice: price * 0.6,
						description: ''
					}
				});
				partsCreated++;

				// Create placeholder image
				await prisma.partImage.create({
					data: {
						partId: part.id,
						imageUrl: 'https://via.placeholder.com/600x600/2563EB/FFFFFF?text=Auto+Part',
						altText: title,
						orderIndex: 0
					}
				});
				imagesCreated++;

				if (i % 10 === 0) {
					process.stdout.write(`Обработано: ${i}/${limit}\r`);
				}

			} catch (error) {
				console.error(`Ошибка в строке ${i}:`, error.message);
			}
		}

		console.log('\n');
		console.log('✅ Import completed!\n');
		console.log('📊 Statistics:');
		console.log(`  Brands created: ${brandsCreated}`);
		console.log(`  Warehouses created: ${warehousesCreated}`);
		console.log(`  Parts created: ${partsCreated}`);
		console.log(`  Images created: ${imagesCreated}`);

	} catch (error) {
		console.error('❌ Import failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

importFromCSV();

