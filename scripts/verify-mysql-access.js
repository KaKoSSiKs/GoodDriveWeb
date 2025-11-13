// Проверка доступа к MySQL с учетными данными из .env
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
	console.error('❌ DATABASE_URL не найден в .env');
	process.exit(1);
}

// Парсим DATABASE_URL: mysql://user:password@host:port/database
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
	console.error('❌ Неверный формат DATABASE_URL');
	process.exit(1);
}

const [, user, password, host, port, database] = match;

console.log(`🔍 Попытка подключения к MySQL:`);
console.log(`   Host: ${host}`);
console.log(`   Port: ${port}`);
console.log(`   User: ${user}`);
console.log(`   Database: ${database}`);

async function testConnection() {
	let connection;
	try {
		connection = await mysql.createConnection({
			host,
			port: parseInt(port),
			user,
			password,
			database
		});

		console.log('✅ Подключение успешно!');
		
		const [rows] = await connection.execute('SELECT COUNT(*) as count FROM parts WHERE is_active = 1');
		console.log(`📦 Активных товаров: ${rows[0].count}`);
		
		await connection.end();
		console.log('\n✅ Все проверки пройдены!');
		
	} catch (error) {
		console.error('\n❌ Ошибка подключения:', error.message);
		console.error('\n💡 Возможные решения:');
		console.error('1. Убедитесь, что MySQL запущен');
		console.error('2. Проверьте, что пользователь существует и имеет права доступа');
		console.error('3. Проверьте, что база данных существует');
		console.error('4. Проверьте пароль пользователя');
		process.exit(1);
	}
}

testConnection();

