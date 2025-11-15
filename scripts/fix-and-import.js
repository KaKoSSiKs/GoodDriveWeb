#!/usr/bin/env node
/**
 * Полный скрипт: исправление пользователя MySQL + импорт данных
 * Использование: docker compose exec app node scripts/fix-and-import.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// НАСТРОЙКИ - ИЗМЕНИТЕ ПРИ НЕОБХОДИМОСТИ
// =============================================================================
const CONFIG = {
  // MySQL настройки
  mysql: {
    rootPassword: 'FVhVbc_6jdmgCBR2R_Vf',  // ⬅️ Пароль root из .env
    user: 'gooddrive_user',
    password: 'o7E-PX1P0t32vs3m-z',         // ⬅️ Пароль пользователя из .env
    database: 'gooddrive_db',
    host: 'mysql'
  },
  
  // Импорт
  importLimit: 0,        // 0 = все строки, 100 = первые 100
  forceImport: false     // true = принудительный импорт
};

// =============================================================================
// ШАГ 1: ИСПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ MYSQL
// =============================================================================

async function fixMySQLUser() {
  console.log('🔧 ШАГ 1: Исправление пользователя MySQL...\n');
  
  // Используем Prisma для выполнения сырых SQL команд от имени root
  // Сначала подключаемся как root для создания пользователя
  const rootPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `mysql://root:${CONFIG.mysql.rootPassword}@${CONFIG.mysql.host}:3306/mysql`
      }
    }
  });

  try {
    console.log('Создаем базу данных и пользователя...');
    
    // Создаем базу данных
    await rootPrisma.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${CONFIG.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    // Удаляем пользователя если существует
    try {
      await rootPrisma.$executeRawUnsafe(`DROP USER IF EXISTS '${CONFIG.mysql.user}'@'%'`);
    } catch (e) {
      // Игнорируем ошибку если пользователя нет
    }
    
    // Создаем пользователя
    await rootPrisma.$executeRawUnsafe(`CREATE USER '${CONFIG.mysql.user}'@'%' IDENTIFIED WITH mysql_native_password BY '${CONFIG.mysql.password}'`);
    
    // Предоставляем права
    await rootPrisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON \`${CONFIG.mysql.database}\`.* TO '${CONFIG.mysql.user}'@'%'`);
    
    // Применяем изменения
    await rootPrisma.$executeRawUnsafe(`FLUSH PRIVILEGES`);
    
    console.log('✅ Пользователь MySQL исправлен!\n');
    await rootPrisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Ошибка при исправлении пользователя MySQL:', error.message);
    console.error('\n💡 Попробуйте выполнить вручную:');
    console.error(`docker compose exec mysql mysql -u root -p"${CONFIG.mysql.rootPassword}" -e "CREATE DATABASE IF NOT EXISTS ${CONFIG.mysql.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS '${CONFIG.mysql.user}'@'%'; CREATE USER '${CONFIG.mysql.user}'@'%' IDENTIFIED WITH mysql_native_password BY '${CONFIG.mysql.password}'; GRANT ALL PRIVILEGES ON ${CONFIG.mysql.database}.* TO '${CONFIG.mysql.user}'@'%'; FLUSH PRIVILEGES;"`);
    await rootPrisma.$disconnect();
    return false;
  }
}

// =============================================================================
// ШАГ 2: ИМПОРТ ДАННЫХ
// =============================================================================

const DATABASE_URL = `mysql://${CONFIG.mysql.user}:${CONFIG.mysql.password}@${CONFIG.mysql.host}:3306/${CONFIG.mysql.database}`;
process.env.DATABASE_URL = DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (nextChar === '"' && inQuotes) {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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
  const cleaned = priceStr.replace(',', '.').replace(/\s/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseIntSafe(value, defaultValue = 0) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return defaultValue;
  }
  const strValue = String(value).trim();
  if (strValue === '') return defaultValue;
  const parsed = parseInt(strValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

async function importData() {
  console.log('📦 ШАГ 2: Импорт данных из CSV...\n');
  console.log(`📊 Параметры подключения:`);
  console.log(`  - Хост: ${CONFIG.mysql.host}`);
  console.log(`  - База данных: ${CONFIG.mysql.database}`);
  console.log(`  - Пользователь: ${CONFIG.mysql.user}`);
  console.log('');

  // Поиск CSV файла
  const possiblePaths = [
    path.join(__dirname, '../docker/mysql/data.csv'),
    path.join(__dirname, '../db_of_catalog.csv'),
    '/app/docker/mysql/data.csv',
    '/app/db_of_catalog.csv'
  ];
  
  let csvFile = null;
  for (const csvPath of possiblePaths) {
    if (fs.existsSync(csvPath)) {
      csvFile = csvPath;
      break;
    }
  }

  if (!csvFile) {
    console.error('❌ CSV файл не найден!');
    console.error('Искали в:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    return false;
  }

  console.log(`📄 CSV файл: ${csvFile}\n`);

  try {
    // Проверка подключения
    console.log('🔍 Проверка подключения к БД...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Подключение успешно!\n');

    // Проверка существующих данных
    const existingPartsCount = await prisma.part.count();
    if (existingPartsCount > 0 && !CONFIG.forceImport) {
      console.log(`⚠️  В базе уже есть ${existingPartsCount} товаров.`);
      console.log('Для принудительного импорта установите forceImport: true в скрипте\n');
      return true;
    }

    // Чтение CSV
    console.log('📖 Чтение CSV файла...');
    let fileContent = fs.readFileSync(csvFile, 'utf-8');
    
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim());
    console.log(`📄 Всего строк в CSV: ${lines.length}\n`);

    if (lines.length < 2) {
      console.error('❌ CSV файл пуст или содержит только заголовок');
      return false;
    }

    const totalRows = lines.length - 1;
    const rowsToProcess = CONFIG.importLimit === 0 
      ? totalRows 
      : Math.min(CONFIG.importLimit, totalRows);
    
    console.log(`📦 Будет обработано: ${rowsToProcess} товаров\n`);

    const stats = {
      brandsCreated: 0,
      warehousesCreated: 0,
      partsCreated: 0,
      partsUpdated: 0,
      partsSkipped: 0,
      errors: 0
    };

    const brandCache = new Map();
    const warehouseCache = new Map();

    console.log('🔄 Начинаем импорт...\n');
    
    for (let i = 1; i <= rowsToProcess; i++) {
      const values = parseCSVLine(lines[i]);
      
      try {
        if (values.length < 12) {
          stats.partsSkipped++;
          continue;
        }

        const title = values[1]?.trim();
        if (!title || title === 'False' || title === '' || title.length > 200) {
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

        // Бренд
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
          }
          brandCache.set(brandName, brand);
        }

        // Склад
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
          }
          warehouseCache.set(warehouseName, warehouse);
        }

        // Товар
        let existingPart = null;
        if (originalNumber) {
          existingPart = await prisma.part.findFirst({
            where: {
              originalNumber: originalNumber,
              brandId: brand.id
            }
          });
        }

        if (!existingPart) {
          existingPart = await prisma.part.findFirst({
            where: {
              title: title,
              brandId: brand.id
            }
          });
        }

        if (existingPart && !CONFIG.forceImport) {
          stats.partsSkipped++;
          continue;
        }

        if (priceOpt <= 0) {
          stats.partsSkipped++;
          continue;
        }

        const calculatedAvailable = available > 0 ? available : Math.max(0, stock - reserve);
        
        if (existingPart) {
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
              available: calculatedAvailable,
              priceOpt: priceOpt,
              costPrice: priceOpt * 0.6,
              isActive: true
            }
          });
          stats.partsUpdated++;
        } else {
          await prisma.part.create({
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
              costPrice: priceOpt * 0.6,
              description: null
            }
          });
          stats.partsCreated++;
        }

        if (i % 100 === 0) {
          console.log(`📊 Прогресс: ${i}/${rowsToProcess} (${Math.round((i / rowsToProcess) * 100)}%)`);
          console.log(`  ✅ Создано: ${stats.partsCreated} | Обновлено: ${stats.partsUpdated} | Пропущено: ${stats.partsSkipped}\n`);
        }

      } catch (error) {
        console.error(`❌ Ошибка в строке ${i}: ${error.message}`);
        stats.errors++;
      }
    }

    console.log('\n✅ Импорт завершен!\n');
    console.log('📊 Итоговая статистика:');
    console.log(`  📦 Брендов создано: ${stats.brandsCreated}`);
    console.log(`  🏭 Складов создано: ${stats.warehousesCreated}`);
    console.log(`  ✅ Товаров создано: ${stats.partsCreated}`);
    console.log(`  🔄 Товаров обновлено: ${stats.partsUpdated}`);
    console.log(`  ⏭️  Товаров пропущено: ${stats.partsSkipped}`);
    console.log(`  ⚠️  Ошибок: ${stats.errors}\n`);

    return true;

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// =============================================================================
// ГЛАВНАЯ ФУНКЦИЯ
// =============================================================================

async function main() {
  console.log('🚀 Полный скрипт: Исправление MySQL + Импорт данных\n');
  console.log('='.repeat(60));
  console.log('');
  
  // Шаг 1: Исправить пользователя MySQL
  const userFixed = fixMySQLUser();
  if (!userFixed) {
    console.log('\n⚠️  Не удалось исправить пользователя автоматически.');
    console.log('Попробуйте выполнить вручную (см. документацию/FIX_MYSQL_AUTH.md)');
    console.log('Или продолжить импорт, если пользователь уже исправлен...\n');
  }
  
  // Небольшая задержка для применения изменений
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Шаг 2: Импорт данных
  const importSuccess = await importData();
  
  if (importSuccess) {
    console.log('🎉 Всё готово! Данные импортированы.');
  } else {
    console.log('❌ Импорт не завершен. Проверьте ошибки выше.');
    process.exit(1);
  }
}

main();

