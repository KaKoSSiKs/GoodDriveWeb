/**
 * Импорт локальных изображений из static/images/parts в таблицу catalog_part_images
 *
 * Использование:
 *   node scripts/import-local-images.js
 *
 * Дополнительно:
 *   FORCE_IMPORT_IMAGES=true node scripts/import-local-images.js
 *     - перезаписывает изображения даже если у товара уже есть записи в БД
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const IMAGES_DIR = path.join(__dirname, '../static/images/parts');
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const FORCE_IMPORT = process.env.FORCE_IMPORT_IMAGES === 'true';

function getAllImageFiles() {
	if (!fs.existsSync(IMAGES_DIR)) {
		throw new Error(`Папка с изображениями не найдена: ${IMAGES_DIR}`);
	}

	return fs
		.readdirSync(IMAGES_DIR)
		.filter((file) => SUPPORTED_EXTENSIONS.has(path.extname(file).toLowerCase()));
}

function extractPartId(filename) {
	const match = filename.match(/^(\d+)/);
	return match ? Number(match[1]) : null;
}

function groupFilesByPart(files) {
	const map = new Map();

	for (const file of files) {
		const partId = extractPartId(file);
		if (!partId) continue;

		if (!map.has(partId)) {
			map.set(partId, []);
		}
		map.get(partId).push(file);
	}

	for (const list of map.values()) {
		list.sort((a, b) => a.localeCompare(b, 'ru'));
	}

	return map;
}

async function importImagesForPart(partId, files) {
	const part = await prisma.part.findUnique({
		where: { id: partId },
		select: {
			id: true,
			title: true,
			images: { select: { id: true } }
		}
	});

	if (!part) {
		return { status: 'missing_part' };
	}

	if (part.images.length > 0 && !FORCE_IMPORT) {
		return { status: 'has_images' };
	}

	if (FORCE_IMPORT && part.images.length > 0) {
		await prisma.partImage.deleteMany({ where: { partId } });
	}

	let created = 0;
	for (let index = 0; index < files.length; index++) {
		const file = files[index];
		await prisma.partImage.create({
			data: {
				partId,
				imageUrl: `/images/parts/${file}`,
				altText: part.title || `Товар ${partId}`,
				orderIndex: index
			}
		});
		created++;
	}

	return { status: 'imported', created };
}

async function main() {
	console.log('🚀 Импорт локальных изображений в БД\n');
	console.log(`📁 Папка: ${IMAGES_DIR}`);
	console.log(`⚙️  FORCE_IMPORT_IMAGES=${FORCE_IMPORT}\n`);

	const files = getAllImageFiles();
	if (files.length === 0) {
		console.log('⚠️  В папке нет изображений. Завершаем.');
		return;
	}

	const grouped = groupFilesByPart(files);
	const stats = {
		totalParts: grouped.size,
		importedParts: 0,
		skippedHasImages: 0,
		missingParts: 0,
		imagesCreated: 0
	};

	let counter = 0;
	for (const [partId, partFiles] of grouped.entries()) {
		counter++;
		process.stdout.write(`\rОбработка ${counter}/${stats.totalParts} (partId=${partId})...`);

		try {
			const result = await importImagesForPart(partId, partFiles);
			switch (result.status) {
				case 'imported':
					stats.importedParts++;
					stats.imagesCreated += result.created ?? 0;
					break;
				case 'has_images':
					stats.skippedHasImages++;
					break;
				case 'missing_part':
					stats.missingParts++;
					break;
			}
		} catch (error) {
			console.error(`\n❌ Ошибка при обработке partId=${partId}:`, error.message);
		}
	}

	console.log('\n\n✅ Импорт завершён');
	console.log(`  Товаров с изображениями: ${stats.importedParts}`);
	console.log(`  Создано записей PartImage: ${stats.imagesCreated}`);
	console.log(`  Пропущено (уже есть изображения): ${stats.skippedHasImages}`);
	console.log(`  Не найдены в БД: ${stats.missingParts}`);
}

main()
	.catch((error) => {
		console.error('\n❌ Критическая ошибка импорта:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

