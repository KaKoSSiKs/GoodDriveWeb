/**
 * ФИНАЛЬНЫЙ ПРОСТОЙ СКРИПТ ИМПОРТА
 * Использование: docker compose exec app node scripts/import-final.js
 * 
 * ВАЖНО: Сначала исправьте пользователя MySQL вручную (см. инструкцию ниже)
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// НАСТРОЙКИ ПОДКЛЮЧЕНИЯ - ИЗМЕНИТЕ ПРИ НЕОБХОДИМОСТИ
// =============================================================================
const DB_CONFIG = {
  host: 'mysql',
  port: 3306,
  user: 'gooddrive_user',
  password: 'o7E-PX1P0t32vs3m-z',  // ⬅️ ИЗМЕНИТЕ НА ВАШ ПАРОЛЬ!
  database: 'gooddrive_db'
};

const DATABASE_URL = `mysql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;
process.env.DATABASE_URL = DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// =============================================================================
// ФУНКЦИИ ПАРСИНГА
// =============================================================================

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

// =============================================================================
// ИМПОРТ ДАННЫХ
// =============================================================================

async function importData() {
  console.log('🚀 Импорт данных из CSV в MySQL\n');
  console.log('📊 Параметры подключения:');
  console.log(`  - Хост: ${DB_CONFIG.host}`);
  console.log(`  - База данных: ${DB_CONFIG.database}`);
  console.log(`  - Пользователь: ${DB_CONFIG.user}`);
  console.log(`  - Пароль: ${'*'.repeat(DB_CONFIG.password.length)}\n`);

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
    process.exit(1);
  }

  console.log(`📄 CSV файл: ${csvFile}\n`);

  try {
    // Проверка подключения
    console.log('🔍 Проверка подключения к БД...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Подключение успешно!\n');

    // Проверка существующих данных
    const existingPartsCount = await prisma.part.count();
    if (existingPartsCount > 0) {
      console.log(`⚠️  В базе уже есть ${existingPartsCount} товаров.`);
      console.log('Продолжаем импорт (существующие товары будут обновлены)...\n');
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
      process.exit(1);
    }

    const totalRows = lines.length - 1;
    console.log(`📦 Будет обработано: ${totalRows} товаров\n`);

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
    
    for (let i = 1; i <= totalRows; i++) {
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

        if (priceOpt <= 0) {
          stats.partsSkipped++;
          continue;
        }

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
          console.log(`📊 Прогресс: ${i}/${totalRows} (${Math.round((i / totalRows) * 100)}%)`);
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

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск
importData();

