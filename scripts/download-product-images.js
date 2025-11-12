// Скрипт для загрузки изображений товаров из бесплатных источников
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Папка для сохранения изображений
const IMAGES_DIR = path.join(__dirname, '../static/images/parts');

// Создаем папку если её нет
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Функция для загрузки изображения
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Редирект
        file.close();
        fs.unlinkSync(filepath);
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

// Генерация URL изображения на основе названия товара
function generateImageUrl(title, index = 0) {
  // Используем Placeholder.com с текстом (бесплатный, без ограничений)
  // Или используем DummyImage.com
  const safeTitle = title.substring(0, 30).replace(/[^\w\s]/g, '');
  const width = 600;
  const height = 600;
  const bgColor = 'f3f4f6';
  const textColor = '6b7280';
  
  // Используем placeholder с текстом названия
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(safeTitle)}`;
}

// Альтернативный источник - Placeholder с разными цветами
function generateAlternativeImageUrl(title, index = 0) {
  const colors = [
    'e5e7eb', 'd1d5db', '9ca3af', '6b7280', 
    'fef3c7', 'fde68a', 'fcd34d', 'fbbf24',
    'dbeafe', 'bfdbfe', '93c5fd', '60a5fa',
    'e0e7ff', 'c7d2fe', 'a5b4fc', '818cf8'
  ];
  const color = colors[(index + Date.now()) % colors.length];
  const width = 600;
  const height = 600;
  const textColor = '374151';
  
  return `https://via.placeholder.com/${width}x${height}/${color}/${textColor}?text=Auto+Part`;
}

// Генерация через Placeholder API с категорией
function generateCategoryImageUrl(title, category, index = 0) {
  const width = 600;
  const height = 600;
  const bgColor = '1f2937';
  const textColor = 'ffffff';
  const categoryText = category.substring(0, 20);
  
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(categoryText)}`;
}

// Извлечение категории из названия товара
function extractCategory(title) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('фильтр')) return 'Фильтр';
  if (titleLower.includes('подшипник')) return 'Подшипник';
  if (titleLower.includes('прокладка')) return 'Прокладка';
  if (titleLower.includes('фонарь') || titleLower.includes('лампа')) return 'Фонарь';
  if (titleLower.includes('тормоз') || titleLower.includes('колодк')) return 'Тормоза';
  if (titleLower.includes('амортизатор') || titleLower.includes('стойк')) return 'Подвеска';
  if (titleLower.includes('двигатель') || titleLower.includes('мотор')) return 'Двигатель';
  if (titleLower.includes('электрон') || titleLower.includes('датчик')) return 'Электроника';
  if (titleLower.includes('помпа') || titleLower.includes('насос')) return 'Помпа';
  if (titleLower.includes('домкрат')) return 'Домкрат';
  if (titleLower.includes('замок')) return 'Замок';
  if (titleLower.includes('кнопка')) return 'Кнопка';
  if (titleLower.includes('крышка')) return 'Крышка';
  if (titleLower.includes('наконечник')) return 'Наконечник';
  if (titleLower.includes('переключатель')) return 'Переключатель';
  if (titleLower.includes('предохранитель')) return 'Предохранитель';
  if (titleLower.includes('ремкомплект')) return 'Ремкомплект';
  if (titleLower.includes('втулка')) return 'Втулка';
  if (titleLower.includes('хомут')) return 'Хомут';
  if (titleLower.includes('бампер')) return 'Бампер';
  if (titleLower.includes('прикуриватель')) return 'Прикуриватель';
  if (titleLower.includes('ключ')) return 'Инструмент';
  if (titleLower.includes('молоток')) return 'Инструмент';
  if (titleLower.includes('монтировка')) return 'Инструмент';
  if (titleLower.includes('мультиметр')) return 'Инструмент';
  if (titleLower.includes('изолента')) return 'Материалы';
  if (titleLower.includes('пыльник')) return 'Пыльник';
  if (titleLower.includes('трапеция')) return 'Трапеция';
  if (titleLower.includes('пистон')) return 'Крепеж';
  if (titleLower.includes('приспособление')) return 'Инструмент';
  if (titleLower.includes('съемник')) return 'Инструмент';
  if (titleLower.includes('экцентрик')) return 'Эксцентрик';
  
  return 'Автозапчасть';
}

// Извлечение ключевых слов из названия товара
function extractKeywords(title) {
  // Убираем лишние слова и оставляем ключевые
  const stopWords = ['для', 'ВАЗ', 'Lada', 'авто', 'автомобиль', 'машина', 'универсальный', 'универсальная'];
  
  // Разбиваем на слова
  let words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 3); // Берем первые 3 ключевых слова
  
  // Если слов мало, добавляем общие категории
  if (words.length < 2) {
    if (title.toLowerCase().includes('фильтр')) words.push('car filter');
    if (title.toLowerCase().includes('подшипник')) words.push('bearing');
    if (title.toLowerCase().includes('прокладка')) words.push('gasket');
    if (title.toLowerCase().includes('фонарь') || title.toLowerCase().includes('лампа')) words.push('car light');
    if (title.toLowerCase().includes('тормоз') || title.toLowerCase().includes('колодк')) words.push('brake');
    if (title.toLowerCase().includes('амортизатор') || title.toLowerCase().includes('стойк')) words.push('shock absorber');
    if (title.toLowerCase().includes('двигатель') || title.toLowerCase().includes('мотор')) words.push('engine');
    if (title.toLowerCase().includes('электрон')) words.push('electronics');
    if (title.toLowerCase().includes('датчик')) words.push('sensor');
    if (title.toLowerCase().includes('помпа') || title.toLowerCase().includes('насос')) words.push('pump');
    if (title.toLowerCase().includes('домкрат')) words.push('jack');
    if (title.toLowerCase().includes('замок')) words.push('lock');
    if (title.toLowerCase().includes('кнопка')) words.push('button');
    if (title.toLowerCase().includes('крышка')) words.push('cover');
    if (title.toLowerCase().includes('наконечник')) words.push('connector');
    if (title.toLowerCase().includes('переключатель')) words.push('switch');
    if (title.toLowerCase().includes('предохранитель')) words.push('fuse');
    if (title.toLowerCase().includes('ремкомплект')) words.push('repair kit');
    if (title.toLowerCase().includes('втулка')) words.push('bushing');
    if (title.toLowerCase().includes('хомут')) words.push('clamp');
    if (title.toLowerCase().includes('бампер')) words.push('bumper');
    if (title.toLowerCase().includes('прикуриватель')) words.push('cigarette lighter');
    if (title.toLowerCase().includes('ключ')) words.push('key tool');
    if (title.toLowerCase().includes('молоток')) words.push('hammer');
    if (title.toLowerCase().includes('монтировка')) words.push('crowbar');
    if (title.toLowerCase().includes('мультиметр')) words.push('multimeter');
    if (title.toLowerCase().includes('изолента')) words.push('electrical tape');
    if (title.toLowerCase().includes('пыльник')) words.push('boot');
    if (title.toLowerCase().includes('стойк')) words.push('strut');
    if (title.toLowerCase().includes('трапеция')) words.push('linkage');
    if (title.toLowerCase().includes('пистон')) words.push('clip');
    if (title.toLowerCase().includes('приспособление')) words.push('tool');
    if (title.toLowerCase().includes('съемник')) words.push('puller');
    if (title.toLowerCase().includes('экцентрик')) words.push('eccentric');
    
    // Если все еще мало слов, добавляем общее
    if (words.length < 2) {
      words.push('car part', 'automotive');
    }
  }
  
  return words;
}

// Загрузка изображения с повторными попытками
async function downloadWithRetry(url, filepath, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await downloadImage(url, filepath);
      return true;
    } catch (error) {
      if (i === retries - 1) {
        console.error(`  ❌ Не удалось загрузить после ${retries} попыток: ${error.message}`);
        return false;
      }
      // Ждем перед повторной попыткой
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return false;
}

// Основная функция
async function downloadImagesForParts() {
  console.log('🚀 Начинаем загрузку изображений для товаров...\n');
  
  try {
    // Получаем все товары из базы данных
    const parts = await prisma.part.findMany({
      where: { isActive: true },
      include: {
        images: true
      },
      take: 100 // Обрабатываем первые 100 товаров
    });
    
    console.log(`📦 Найдено товаров: ${parts.length}\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Пропускаем если уже есть изображения
      if (part.images && part.images.length > 0) {
        console.log(`⏭️  [${i + 1}/${parts.length}] Пропущен: ${part.title} (уже есть ${part.images.length} изображений)`);
        skipCount++;
        continue;
      }
      
      console.log(`📥 [${i + 1}/${parts.length}] Загрузка изображений для: ${part.title}`);
      
      // Генерируем 1-3 изображения для каждого товара
      const imageCount = Math.floor(Math.random() * 3) + 1; // 1-3 изображения
      const downloadedImages = [];
      
      // Определяем категорию товара
      const category = extractCategory(part.title);
      
      for (let imgIndex = 0; imgIndex < imageCount; imgIndex++) {
        try {
          // Генерируем имя файла
          const safeTitle = part.title
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .substring(0, 50);
          const filename = `${part.id}-${safeTitle}-${imgIndex + 1}.jpg`;
          const filepath = path.join(IMAGES_DIR, filename);
          
          // Пробуем разные источники
          let imageUrl;
          if (imgIndex === 0) {
            // Первое изображение - с названием товара
            imageUrl = generateImageUrl(part.title, imgIndex);
          } else if (imgIndex === 1 && category) {
            // Второе изображение - с категорией
            imageUrl = generateCategoryImageUrl(part.title, category, imgIndex);
          } else {
            // Остальные - альтернативный источник
            imageUrl = generateAlternativeImageUrl(part.title, imgIndex);
          }
          
          console.log(`  📷 Загрузка изображения ${imgIndex + 1}/${imageCount}...`);
          
          // Загружаем изображение
          const success = await downloadWithRetry(imageUrl, filepath);
          
          if (success && fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            // Проверяем что файл не пустой (минимум 1KB)
            if (stats.size > 1024) {
              const imageUrl = `/images/parts/${filename}`;
              downloadedImages.push({
                imageUrl,
                altText: part.title,
                orderIndex: imgIndex
              });
              console.log(`  ✅ Изображение ${imgIndex + 1} загружено: ${filename}`);
            } else {
              fs.unlinkSync(filepath);
              console.log(`  ⚠️  Изображение ${imgIndex + 1} слишком маленькое, пропущено`);
            }
          }
          
          // Небольшая задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`  ❌ Ошибка загрузки изображения ${imgIndex + 1}:`, error.message);
        }
      }
      
      // Сохраняем изображения в базу данных
      if (downloadedImages.length > 0) {
        try {
          for (const img of downloadedImages) {
            await prisma.partImage.create({
              data: {
                partId: part.id,
                imageUrl: img.imageUrl,
                altText: img.altText,
                orderIndex: img.orderIndex
              }
            });
          }
          console.log(`  ✅ Сохранено ${downloadedImages.length} изображений в БД\n`);
          successCount++;
        } catch (error) {
          console.error(`  ❌ Ошибка сохранения в БД:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`  ⚠️  Не удалось загрузить изображения\n`);
        errorCount++;
      }
      
      // Прогресс каждые 10 товаров
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Прогресс: ${i + 1}/${parts.length} товаров обработано\n`);
      }
    }
    
    console.log('\n✅ Загрузка завершена!\n');
    console.log('📊 Статистика:');
    console.log(`  ✅ Успешно: ${successCount}`);
    console.log(`  ⏭️  Пропущено (уже есть): ${skipCount}`);
    console.log(`  ❌ Ошибок: ${errorCount}`);
    console.log(`  📁 Изображения сохранены в: ${IMAGES_DIR}\n`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

downloadImagesForParts();

