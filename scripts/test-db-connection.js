// Скрипт для проверки подключения к базе данных
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения из .env файла
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
	const envContent = fs.readFileSync(envPath, 'utf-8');
	const envLines = envContent.split(/\r?\n/);
	
	for (const line of envLines) {
		const trimmedLine = line.trim();
		if (!trimmedLine || trimmedLine.startsWith('#')) continue;
		
		const match = trimmedLine.match(/^([^=]+)=(.*)$/);
		if (match) {
			const key = match[1].trim();
			let value = match[2].trim();
			
			if ((value.startsWith('"') && value.endsWith('"')) || 
			    (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}
			
			process.env[key] = value;
		}
	}
}

console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

const prisma = new PrismaClient({
	log: ['error', 'warn'],
});

async function testConnection() {
	try {
		console.log('\n🔍 Проверка подключения к базе данных...');
		
		// Простой запрос для проверки подключения
		await prisma.$queryRaw`SELECT 1 as test`;
		console.log('✅ Подключение к MySQL успешно!');
		
		// Проверяем наличие базы данных
		const dbName = process.env.DATABASE_URL?.match(/\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)?.[5];
		console.log(`📊 База данных: ${dbName || 'не определена'}`);
		
		// Проверяем количество товаров
		const partsCount = await prisma.part.count();
		console.log(`📦 Товаров в базе: ${partsCount}`);
		
		// Проверяем количество брендов
		const brandsCount = await prisma.brand.count();
		console.log(`🏷️  Брендов в базе: ${brandsCount}`);
		
		// Проверяем количество складов
		const warehousesCount = await prisma.warehouse.count();
		console.log(`🏭 Складов в базе: ${warehousesCount}`);
		
		console.log('\n✅ Все проверки пройдены успешно!');
		
	} catch (error) {
		console.error('\n❌ Ошибка подключения:', error.message);
		console.error('\n💡 Возможные решения:');
		console.error('1. Убедитесь, что MySQL запущен на localhost:3306');
		console.error('2. Проверьте учетные данные в .env файле');
		console.error('3. Убедитесь, что база данных "gooddrive" существует');
		console.error('4. Проверьте, что пользователь имеет права доступа к базе данных');
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

testConnection();

