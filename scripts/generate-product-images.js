// Скрипт для генерации качественных изображений товаров
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Папка для сохранения изображений
const IMAGES_DIR = path.join(__dirname, '../static/images/parts');

// Создаем папку если её нет
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Цветовые схемы для разных категорий
const categoryColors = {
  'Фильтр': { bg: '#3b82f6', text: '#ffffff', accent: '#60a5fa' },
  'Подшипник': { bg: '#8b5cf6', text: '#ffffff', accent: '#a78bfa' },
  'Прокладка': { bg: '#10b981', text: '#ffffff', accent: '#34d399' },
  'Фонарь': { bg: '#f59e0b', text: '#ffffff', accent: '#fbbf24' },
  'Тормоза': { bg: '#ef4444', text: '#ffffff', accent: '#f87171' },
  'Подвеска': { bg: '#6366f1', text: '#ffffff', accent: '#818cf8' },
  'Двигатель': { bg: '#dc2626', text: '#ffffff', accent: '#f87171' },
  'Электроника': { bg: '#06b6d4', text: '#ffffff', accent: '#22d3ee' },
  'Помпа': { bg: '#14b8a6', text: '#ffffff', accent: '#5eead4' },
  'Домкрат': { bg: '#64748b', text: '#ffffff', accent: '#94a3b8' },
  'Замок': { bg: '#7c3aed', text: '#ffffff', accent: '#a78bfa' },
  'Кнопка': { bg: '#ec4899', text: '#ffffff', accent: '#f472b6' },
  'Крышка': { bg: '#0ea5e9', text: '#ffffff', accent: '#38bdf8' },
  'Наконечник': { bg: '#f97316', text: '#ffffff', accent: '#fb923c' },
  'Переключатель': { bg: '#8b5cf6', text: '#ffffff', accent: '#a78bfa' },
  'Предохранитель': { bg: '#eab308', text: '#ffffff', accent: '#fcd34d' },
  'Ремкомплект': { bg: '#06b6d4', text: '#ffffff', accent: '#22d3ee' },
  'Втулка': { bg: '#84cc16', text: '#ffffff', accent: '#a3e635' },
  'Хомут': { bg: '#64748b', text: '#ffffff', accent: '#94a3b8' },
  'Бампер': { bg: '#1e293b', text: '#ffffff', accent: '#475569' },
  'Прикуриватель': { bg: '#f59e0b', text: '#ffffff', accent: '#fbbf24' },
  'Инструмент': { bg: '#475569', text: '#ffffff', accent: '#64748b' },
  'Материалы': { bg: '#059669', text: '#ffffff', accent: '#10b981' },
  'Пыльник': { bg: '#7c2d12', text: '#ffffff', accent: '#9a3412' },
  'Трапеция': { bg: '#1e40af', text: '#ffffff', accent: '#3b82f6' },
  'Крепеж': { bg: '#6b7280', text: '#ffffff', accent: '#9ca3af' },
  'Эксцентрик': { bg: '#be185d', text: '#ffffff', accent: '#ec4899' },
  'Автозапчасть': { bg: '#1f2937', text: '#ffffff', accent: '#374151' }
};

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
  if (titleLower.includes('ключ') || titleLower.includes('молоток') || titleLower.includes('монтировка') || titleLower.includes('мультиметр') || titleLower.includes('приспособление') || titleLower.includes('съемник')) return 'Инструмент';
  if (titleLower.includes('изолента')) return 'Материалы';
  if (titleLower.includes('пыльник')) return 'Пыльник';
  if (titleLower.includes('трапеция')) return 'Трапеция';
  if (titleLower.includes('пистон')) return 'Крепеж';
  if (titleLower.includes('экцентрик')) return 'Эксцентрик';
  
  return 'Автозапчасть';
}

// Генерация SVG изображения товара
function generateProductSVG(part, category, index = 0) {
  const width = 800;
  const height = 800;
  
  // Получаем цветовую схему
  const colors = categoryColors[category] || categoryColors['Автозапчасть'];
  
  // Разбиваем название на строки
  const words = part.title.split(' ');
  const lines = [];
  let currentLine = '';
  const maxCharsPerLine = 30;
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Ограничиваем до 3 строк
  const displayLines = lines.slice(0, 3);
  
  // Создаем SVG
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Фон -->
  <rect width="${width}" height="${height}" fill="url(#grad${index})"/>
  
  <!-- Декоративные круги -->
  ${Array.from({ length: 5 }, (_, i) => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 100 + 50;
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="rgba(255,255,255,0.1)"/>`;
  }).join('\n  ')}
  
  <!-- Рамка -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" 
        fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
  
  <!-- Название товара -->
  ${displayLines.map((line, i) => {
    const y = height / 2 - (displayLines.length - 1) * 40 / 2 + i * 40;
    return `<text x="${width / 2}" y="${y}" 
                  font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
                  fill="${colors.text}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`;
  }).join('\n  ')}
  
  <!-- Категория -->
  <text x="${width / 2}" y="${height / 2 + 60}" 
        font-family="Arial, sans-serif" font-size="24" 
        fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">${escapeXml(category)}</text>
  
  <!-- Номер товара -->
  ${part.originalNumber || part.manufacturerNumber ? `
  <text x="${width / 2}" y="${height / 2 + 100}" 
        font-family="Arial, sans-serif" font-size="20" 
        fill="rgba(255,255,255,0.6)" text-anchor="middle" dominant-baseline="middle">№ ${escapeXml(part.originalNumber || part.manufacturerNumber)}</text>
  ` : ''}
  
  <!-- Бренд -->
  ${part.brand && part.brand.name ? `
  <text x="${width / 2}" y="${height - 80}" 
        font-family="Arial, sans-serif" font-size="18" 
        fill="rgba(255,255,255,0.5)" text-anchor="middle" dominant-baseline="middle">${escapeXml(part.brand.name)}</text>
  ` : ''}
  
  <!-- Декоративная линия -->
  <line x1="100" y1="${height - 100}" x2="${width - 100}" y2="${height - 100}" 
        stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
</svg>`;
  
  return svg;
}

// Экранирование XML
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Генерация изображения товара
async function generateProductImage(part, category, index = 0) {
  const safeTitle = part.title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
  const filename = `${part.id}-${safeTitle}-${index + 1}.jpg`;
  const filepath = path.join(IMAGES_DIR, filename);
  
  // Генерируем SVG
  const svg = generateProductSVG(part, category, index);
  
  // Конвертируем SVG в JPEG с помощью sharp
  await sharp(Buffer.from(svg))
    .resize(800, 800)
    .jpeg({ quality: 90 })
    .toFile(filepath);
  
  return {
    filename,
    filepath,
    imageUrl: `/images/parts/${filename}`
  };
}

// Основная функция
async function generateImagesForParts() {
  console.log('🚀 Начинаем генерацию изображений для товаров...\n');
  
  try {
    // Получаем все товары из базы данных
    const parts = await prisma.part.findMany({
      where: { isActive: true },
      include: {
        images: true,
        brand: true
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
      if (part.images && part.images.length >= 3) {
        console.log(`⏭️  [${i + 1}/${parts.length}] Пропущен: ${part.title} (уже есть ${part.images.length} изображений)`);
        skipCount++;
        continue;
      }
      
      console.log(`🎨 [${i + 1}/${parts.length}] Генерация изображений для: ${part.title}`);
      
      // Определяем категорию
      const category = extractCategory(part.title);
      
      // Генерируем 1-3 изображения для каждого товара
      const existingImages = part.images ? part.images.length : 0;
      const neededImages = Math.max(1, 3 - existingImages);
      const imageCount = Math.min(neededImages, 3);
      
      const generatedImages = [];
      
      for (let imgIndex = 0; imgIndex < imageCount; imgIndex++) {
        try {
          console.log(`  📷 Генерация изображения ${imgIndex + 1}/${imageCount}...`);
          
          const imageData = await generateProductImage(part, category, existingImages + imgIndex);
          
          generatedImages.push({
            imageUrl: imageData.imageUrl,
            altText: part.title,
            orderIndex: existingImages + imgIndex
          });
          
          console.log(`  ✅ Изображение ${imgIndex + 1} создано: ${imageData.filename}`);
          
        } catch (error) {
          console.error(`  ❌ Ошибка генерации изображения ${imgIndex + 1}:`, error.message);
        }
      }
      
      // Сохраняем изображения в базу данных
      if (generatedImages.length > 0) {
        try {
          for (const img of generatedImages) {
            await prisma.partImage.create({
              data: {
                partId: part.id,
                imageUrl: img.imageUrl,
                altText: img.altText,
                orderIndex: img.orderIndex
              }
            });
          }
          console.log(`  ✅ Сохранено ${generatedImages.length} изображений в БД\n`);
          successCount++;
        } catch (error) {
          console.error(`  ❌ Ошибка сохранения в БД:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`  ⚠️  Не удалось создать изображения\n`);
        errorCount++;
      }
      
      // Прогресс каждые 10 товаров
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Прогресс: ${i + 1}/${parts.length} товаров обработано\n`);
      }
    }
    
    console.log('\n✅ Генерация завершена!\n');
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

generateImagesForParts();

