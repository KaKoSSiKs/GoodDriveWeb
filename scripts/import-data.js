/**
 * Скрипт для импорта данных из CSV и загрузки изображений
 * 
 * Функции:
 * 1. Импортирует данные из db_of_catalog.csv в MySQL через Prisma
 * 2. Загружает изображения по URL (если указаны в CSV) или генерирует placeholder
 * 3. Сохраняет изображения локально в static/images/parts/
 * 4. Поддерживает настраиваемый лимит на количество импортируемых строк
 * 
 * Использование:
 * - Лимит настраивается через переменную окружения IMPORT_LIMIT (по умолчанию 100)
 * - Для импорта всех данных: IMPORT_LIMIT=0 или не указывать
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Конфигурация
const CONFIG = {
  // Лимит на количество импортируемых строк (0 = все)
  // Можно изменить через переменную окружения IMPORT_LIMIT
  IMPORT_LIMIT: parseInt(process.env.IMPORT_LIMIT || '100', 10),
  
  // Путь к CSV файлу (проверяем несколько возможных мест)
  CSV_FILE: (() => {
    const possiblePaths = [
      path.join(__dirname, '../db_of_catalog.csv'),
      path.join(__dirname, '../docker/mysql/data.csv'),
      '/docker-entrypoint-initdb.d/data.csv',
      '/app/docker/mysql/data.csv'
    ];
    for (const csvPath of possiblePaths) {
      if (fs.existsSync(csvPath)) {
        return csvPath;
      }
    }
    return path.join(__dirname, '../db_of_catalog.csv');
  })(),
  
  // Папка для сохранения изображений
  IMAGES_DIR: path.join(__dirname, '../static/images/parts'),
  
  // Retry настройки для загрузки изображений
  IMAGE_DOWNLOAD_RETRIES: 3,
  IMAGE_DOWNLOAD_TIMEOUT: 10000, // 10 секунд
};

// Создаем папку для изображений если её нет
if (!fs.existsSync(CONFIG.IMAGES_DIR)) {
  fs.mkdirSync(CONFIG.IMAGES_DIR, { recursive: true });
  console.log(`📁 Создана папка для изображений: ${CONFIG.IMAGES_DIR}`);
}

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

/**
 * Парсит цену из строки
 */
function parsePrice(priceStr) {
  if (!priceStr || priceStr.trim() === '') return 0;
  const cleaned = priceStr.replace(',', '.').replace(/\s/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Парсит целое число из строки
 */
function parseIntSafe(value, defaultValue = 0) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return defaultValue;
  }
  const strValue = String(value).trim();
  if (strValue === '') return defaultValue;
  const parsed = parseInt(strValue, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Генерирует URL изображения на основе названия товара
 * Можно заменить на реальный URL из CSV, если он будет добавлен
 */
function generateImageUrl(title, brandName, index = 0) {
  // Используем placeholder.com с текстом названия товара
  const safeTitle = title.substring(0, 30).replace(/[^\w\s]/g, '').replace(/\s+/g, '+');
  const width = 600;
  const height = 600;
  const bgColor = '2563EB';
  const textColor = 'FFFFFF';
  
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(safeTitle)}`;
}

/**
 * Загружает изображение по URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    let downloaded = 0;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        response.on('data', (chunk) => {
          downloaded += chunk.length;
        });
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Редирект
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
    
    request.setTimeout(CONFIG.IMAGE_DOWNLOAD_TIMEOUT, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Загружает изображение с повторными попытками
 */
async function downloadWithRetry(url, filepath, retries = CONFIG.IMAGE_DOWNLOAD_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      await downloadImage(url, filepath);
      return true;
    } catch (error) {
      if (i === retries - 1) {
        console.error(`    ❌ Не удалось загрузить после ${retries} попыток: ${error.message}`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}

/**
 * Сохраняет изображение для товара
 */
async function savePartImage(part, imageUrl, index = 0) {
  try {
    // Генерируем имя файла
    const safeTitle = part.title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    const filename = `${part.id}-${safeTitle}-${index + 1}.jpg`;
    const filepath = path.join(CONFIG.IMAGES_DIR, filename);
    
    // Загружаем изображение
    const success = await downloadWithRetry(imageUrl, filepath);
    
    if (success && fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      // Проверяем что файл не пустой (минимум 1KB)
      if (stats.size > 1024) {
        const localImageUrl = `/images/parts/${filename}`;
        
        // Сохраняем в базу данных
        await prisma.partImage.create({
          data: {
            partId: part.id,
            imageUrl: localImageUrl,
            altText: part.title,
            orderIndex: index
          }
        });
        
        return localImageUrl;
      } else {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`    ❌ Ошибка сохранения изображения: ${error.message}`);
    return null;
  }
}

/**
 * Основная функция импорта данных
 */
async function importData() {
  console.log('🚀 Начинаем импорт данных из CSV...\n');
  console.log(`📊 Конфигурация:`);
  console.log(`  - Лимит импорта: ${CONFIG.IMPORT_LIMIT === 0 ? 'все строки' : CONFIG.IMPORT_LIMIT} строк`);
  console.log(`  - CSV файл: ${CONFIG.CSV_FILE}`);
  console.log(`  - Папка изображений: ${CONFIG.IMAGES_DIR}\n`);

  try {
    // Проверяем, есть ли уже данные в базе
    const existingPartsCount = await prisma.part.count();
    if (existingPartsCount > 0) {
      console.log(`ℹ️  В базе данных уже есть ${existingPartsCount} товаров.`);
      console.log(`ℹ️  Для повторного импорта удалите данные из базы или установите FORCE_IMPORT=true\n`);
      
      // Если установлена переменная FORCE_IMPORT, продолжаем импорт
      if (process.env.FORCE_IMPORT !== 'true') {
        console.log('⏭️  Пропускаем импорт. Установите FORCE_IMPORT=true для принудительного импорта.\n');
        return;
      }
      console.log('⚠️  FORCE_IMPORT=true - выполняем принудительный импорт\n');
    }
    // Проверяем существование CSV файла
    if (!fs.existsSync(CONFIG.CSV_FILE)) {
      console.error(`❌ CSV файл не найден: ${CONFIG.CSV_FILE}`);
      process.exit(1);
    }

    // Читаем CSV файл
    let fileContent;
    try {
      fileContent = fs.readFileSync(CONFIG.CSV_FILE, 'utf-8');
    } catch (error) {
      console.error(`❌ Ошибка чтения CSV файла: ${error.message}`);
      process.exit(1);
    }
    
    // Удаляем BOM если есть
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Разбиваем на строки
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim());
    
    console.log(`📄 Всего строк в CSV: ${lines.length}\n`);
    
    if (lines.length < 2) {
      console.error('❌ CSV файл пуст или содержит только заголовок');
      process.exit(1);
    }

    // Определяем количество строк для обработки
    const totalRows = lines.length - 1; // Минус заголовок
    const rowsToProcess = CONFIG.IMPORT_LIMIT === 0 
      ? totalRows 
      : Math.min(CONFIG.IMPORT_LIMIT, totalRows);
    
    console.log(`📦 Будет обработано: ${rowsToProcess} товаров\n`);

    // Статистика
    const stats = {
      brandsCreated: 0,
      warehousesCreated: 0,
      partsCreated: 0,
      partsUpdated: 0,
      partsSkipped: 0,
      imagesDownloaded: 0,
      imagesFailed: 0,
      errors: 0
    };

    // Кеш для брендов и складов
    const brandCache = new Map();
    const warehouseCache = new Map();

    // Обрабатываем строки
    for (let i = 1; i <= rowsToProcess; i++) {
      const values = parseCSVLine(lines[i]);
      
      try {
        // Валидация данных
        if (values.length < 12) {
          if (i <= 5) {
            console.warn(`⚠️  Строка ${i}: Недостаточно колонок (${values.length} вместо 12)`);
          }
          stats.partsSkipped++;
          continue;
        }

        const title = values[1]?.trim();
        if (!title || title === 'False' || title === '' || title.length > 200) {
          if (i <= 5) {
            console.warn(`⚠️  Строка ${i}: Пропущена - некорректное название`);
          }
          stats.partsSkipped++;
          continue;
        }

        // Извлекаем данные
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
          }
          warehouseCache.set(warehouseName, warehouse);
        }

        // Проверяем существование товара
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

        let part;
        if (existingPart) {
          // Обновляем существующий товар
          part = await prisma.part.update({
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
              available: available > 0 ? available : stock - reserve,
              priceOpt: priceOpt > 0 ? priceOpt : existingPart.priceOpt,
              costPrice: priceOpt > 0 ? priceOpt * 0.6 : existingPart.costPrice,
              isActive: true
            }
          });
          stats.partsUpdated++;
        } else {
          // Проверяем цену
          if (priceOpt <= 0) {
            if (i <= 5) {
              console.warn(`⚠️  Строка ${i}: Цена равна 0, пропускаем товар "${title}"`);
            }
            stats.partsSkipped++;
            continue;
          }

          // Создаем новый товар
          const calculatedAvailable = available > 0 ? available : Math.max(0, stock - reserve);
          
          part = await prisma.part.create({
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

        // Загружаем изображения для товара (если их еще нет)
        const existingImages = await prisma.partImage.findMany({
          where: { partId: part.id }
        });

        if (existingImages.length === 0) {
          // Генерируем URL изображения (можно заменить на реальный URL из CSV)
          const imageUrl = generateImageUrl(title, brandName, 0);
          
          console.log(`  📷 [${i}/${rowsToProcess}] Загрузка изображения для: ${title.substring(0, 50)}...`);
          
          const savedImageUrl = await savePartImage(part, imageUrl, 0);
          
          if (savedImageUrl) {
            stats.imagesDownloaded++;
            console.log(`    ✅ Изображение загружено: ${savedImageUrl}`);
          } else {
            stats.imagesFailed++;
            console.log(`    ⚠️  Не удалось загрузить изображение`);
          }
        }

        // Прогресс каждые 10 товаров
        if (i % 10 === 0) {
          console.log(`\n📊 Прогресс: ${i}/${rowsToProcess} (${Math.round((i / rowsToProcess) * 100)}%)`);
          console.log(`  ✅ Создано: ${stats.partsCreated} | Обновлено: ${stats.partsUpdated} | Пропущено: ${stats.partsSkipped}`);
          console.log(`  📷 Изображений: ${stats.imagesDownloaded} загружено | ${stats.imagesFailed} ошибок\n`);
        }

      } catch (error) {
        console.error(`\n❌ Ошибка в строке ${i}: ${error.message}`);
        if (i <= 5 && error.stack) {
          console.error('Stack:', error.stack);
        }
        stats.errors++;
      }
    }

    // Финальная статистика
    console.log('\n✅ Импорт завершен!\n');
    console.log('📊 Итоговая статистика:');
    console.log(`  📦 Брендов создано: ${stats.brandsCreated}`);
    console.log(`  🏭 Складов создано: ${stats.warehousesCreated}`);
    console.log(`  ✅ Товаров создано: ${stats.partsCreated}`);
    console.log(`  🔄 Товаров обновлено: ${stats.partsUpdated}`);
    console.log(`  ⏭️  Товаров пропущено: ${stats.partsSkipped}`);
    console.log(`  📷 Изображений загружено: ${stats.imagesDownloaded}`);
    console.log(`  ❌ Изображений не загружено: ${stats.imagesFailed}`);
    console.log(`  ⚠️  Ошибок: ${stats.errors}\n`);

  } catch (error) {
    console.error('❌ Критическая ошибка импорта:', error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем импорт
importData();

