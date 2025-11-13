// Маппинг категорий товаров с ключевыми словами
// Ключевые слова определяют, к какой категории относится товар по его назначению

export interface CategoryMapping {
  id: string;
  name: string;
  keywords: string[]; // Ключевые слова для определения категории
  description: string;
}

export const CATEGORIES: CategoryMapping[] = [
  {
    id: 'electronics',
    name: 'Электроника',
    keywords: [
      'датчик', 'сенсор', 'sensor',
      'модуль', 'module', 'блок',
      'провод', 'кабель', 'wire', 'cable',
      'реле', 'relay',
      'контроллер', 'controller',
      'электроника', 'electronics',
      'электрика', 'electrical',
      'разъем', 'connector',
      'предохранитель', 'fuse',
      'генератор', 'alternator',
      'стартер', 'starter',
      'аккумулятор', 'battery',
      'лампочка', 'лампа', 'bulb', 'light'
    ],
    description: 'Датчики, модули, провода'
  },
  {
    id: 'engine',
    name: 'Двигатель',
    keywords: [
      'двигатель', 'engine', 'мотор',
      'фильтр', 'filter',
      'масло', 'oil',
      'ремень', 'belt',
      'поршень', 'piston',
      'кольцо', 'ring',
      'вкладыш', 'bearing',
      'клапан', 'valve',
      'гбц', 'головка', 'head',
      'прокладка', 'gasket',
      'сальник', 'seal',
      'термостат', 'thermostat',
      'водяной насос', 'water pump',
      'помпа', 'pump',
      'радиатор', 'radiator',
      'охлаждение', 'cooling',
      'свеча', 'spark plug',
      'катушка', 'coil',
      'топливный', 'fuel',
      'инжектор', 'injector',
      'карбюратор', 'carburetor',
      'турбина', 'turbo'
    ],
    description: 'Фильтры, масла, ремни'
  },
  {
    id: 'suspension',
    name: 'Подвеска',
    keywords: [
      'подвеска', 'suspension',
      'стойка', 'strut', 'амортизатор', 'shock',
      'пружина', 'spring',
      'рычаг', 'arm', 'lever',
      'сайлентблок', 'silent block', 'втулка', 'bushing',
      'опора', 'support', 'mount',
      'стабилизатор', 'stabilizer',
      'тяга', 'rod', 'link',
      'шаровая', 'ball joint',
      'подшипник', 'bearing',
      'ступица', 'hub',
      'подвесной', 'suspension'
    ],
    description: 'Стойки, амортизаторы, пружины'
  },
  {
    id: 'brakes',
    name: 'Тормоза',
    keywords: [
      'тормоз', 'brake',
      'колодка', 'pad',
      'диск', 'rotor', 'disc',
      'суппорт', 'caliper',
      'тормозной', 'braking',
      'тормозная жидкость', 'brake fluid',
      'шланг', 'hose',
      'цилиндр', 'cylinder',
      'тормозной барабан', 'drum'
    ],
    description: 'Колодки, диски, суппорты'
  }
];

/**
 * Определяет категорию товара по его названию и описанию
 */
export function detectCategory(title: string, description: string = ''): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  // Подсчитываем совпадения для каждой категории
  const categoryScores = CATEGORIES.map(category => {
    const score = category.keywords.reduce((sum, keyword) => {
      const keywordLower = keyword.toLowerCase();
      // Проверяем точное совпадение слова (не подстрока)
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return sum + (regex.test(text) ? 1 : 0);
    }, 0);
    
    return {
      categoryId: category.id,
      score,
      percentage: score / category.keywords.length
    };
  });
  
  // Находим категорию с максимальным количеством совпадений
  const bestMatch = categoryScores.reduce((best, current) => {
    return current.score > best.score ? current : best;
  }, categoryScores[0]);
  
  // Если найдено хотя бы одно совпадение, возвращаем категорию
  return bestMatch.score > 0 ? bestMatch.categoryId : null;
}

/**
 * Получает ключевые слова для категории
 */
export function getCategoryKeywords(categoryId: string): string[] {
  const category = CATEGORIES.find(cat => cat.id === categoryId);
  return category ? category.keywords : [];
}

/**
 * Получает информацию о категории
 */
export function getCategory(categoryId: string): CategoryMapping | null {
  return CATEGORIES.find(cat => cat.id === categoryId) || null;
}

