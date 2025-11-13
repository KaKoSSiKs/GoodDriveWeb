// Скрипт для создания администратора
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения из .env файла
const envPath = path.join(__dirname, '../.env');
try {
	const fs = await import('fs');
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
				
				if (!process.env[key]) {
					process.env[key] = value;
				}
			}
		}
		
		// Если DATABASE_URL указывает на mysql:3306, заменяем на localhost:3306
		if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('mysql:3306')) {
			process.env.DATABASE_URL = process.env.DATABASE_URL.replace('mysql:3306', 'localhost:3306');
			console.log('📝 DATABASE_URL изменен для локального подключения');
		}
	}
} catch (error) {
	console.error('Ошибка загрузки .env файла:', error.message);
}

const prisma = new PrismaClient();

async function createAdmin() {
	console.log('🚀 Создание администратора...\n');

	try {
		const email = 'admin';
		const password = '12345678';
		
		// Хешируем пароль
		const hashedPassword = await bcrypt.hash(password, 10);
		
		// Создаем или обновляем администратора
		const admin = await prisma.user.upsert({
			where: { email: email },
			update: {
				password: hashedPassword,
				isAdmin: true,
				isStaff: true,
				isActive: true,
				firstName: 'Admin',
				lastName: 'User'
			},
			create: {
				email: email,
				password: hashedPassword,
				firstName: 'Admin',
				lastName: 'User',
				isAdmin: true,
				isStaff: true,
				isActive: true
			}
		});

		console.log('✅ Администратор создан/обновлен!\n');
		console.log('📋 Данные для входа:');
		console.log(`  Email: ${admin.email}`);
		console.log(`  Пароль: ${password}`);
		console.log(`  Админ: ${admin.isAdmin ? 'Да' : 'Нет'}`);
		console.log(`  Активен: ${admin.isActive ? 'Да' : 'Нет'}\n`);

	} catch (error) {
		console.error('❌ Ошибка создания администратора:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

createAdmin();

