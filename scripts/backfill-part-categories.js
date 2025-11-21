import { PrismaClient } from '@prisma/client';

// Локальная копия категорий и логики detectCategory,
// чтобы не импортировать TypeScript-модуль из src/lib
const CATEGORIES = [
  {
    id: 'electronics',
    keywords: [
      // базовые электродетали
      'электрика', 'электрооборудование', 'электроника', 'электрический',
      'датчик', 'сенсор', 'sensor',
      'модуль', 'module', 'электронный блок', 'блок управления', 'ecu', 'эбу',
      'реле', 'relay',
      'контроллер', 'controller',
      'щётки генератора', 'щетка генератора',
      'разъем', 'разъём', 'connector', 'фишка',
      'предохранитель', 'fuse',
      'жгут проводов', 'жгут проводки', 'жгут', 'коса проводки', 'проводка',
      'провод', 'кабель', 'wire', 'cable',
      // пуск и заряд
      'генератор', 'alternator',
      'стартер', 'starter',
      'аккумулятор', 'акб', 'battery',
      // освещение
      'лампочка', 'лампа', 'bulb', 'light',
      'фара', 'фары', 'передняя фара', 'задняя фара', 'headlight', 'headlamp',
      'ксенон', 'ксеноновая лампа', 'ксеноновая фара',
      'линза фары', 'корректор фары', 'электрокорректор',
      'противотуманная фара', 'противотуманка', 'птф', 'fog light', 'foglamp',
      'фонарь', 'фонари', 'задний фонарь', 'стоп-сигнал', 'стоп сигнал',
      'габарит', 'габаритный огонь', 'taillight', 'stop light',
      'повторитель поворота', 'повторитель', 'поворотник',
      // зажигание и пуск
      'катушка зажигания', 'катушка', 'ignition coil',
      'свеча зажигания', 'свечи зажигания', 'spark plug',
      'коммутатор зажигания', 'модуль зажигания',
      'датчик коленвала', 'датчик распредвала',
      // стартер/генератор комплектующие
      'бендикс стартера', 'тяговое реле', 'обгонная муфта генератора',
      // электродвигатели
      'электродвигатель', 'электромотор', 'мотор стеклоподъемника', 'мотор стеклоочистителя',
      'моторчик печки', 'мотор отопителя', 'электровентилятор', 'эл. вентилятор',
      // комфорт/мультимедиа
      'магнитола', 'аудиосистема', 'stereo', 'radio', 'головное устройство',
      'усилитель аудио', 'усилитель звука',
      'парктроник', 'датчик парковки', 'камера заднего вида',
      'электростеклоподъемник', 'кнопка стеклоподъемника', 'кнопка стеклоподьемника',
      'блок управления стеклоподъемниками',
      'подогрев сидений', 'подогрев зеркал',
      'датчик абс', 'датчик abs', 'датчик esp'
    ]
  },
  {
    id: 'engine',
    keywords: [
      'двигатель', 'engine', 'мотор', 'двс',
      // фильтры и масла
      'фильтр', 'filter',
      'масляный фильтр', 'фильтр масляный', 'oil filter',
      'топливный фильтр', 'фильтр топливный', 'fuel filter',
      'воздушный фильтр', 'фильтр воздушный', 'air filter',
      'салонный фильтр', 'фильтр салона', 'cabin filter',
      'масло', 'oil', 'двигательное масло', 'моторное масло', 'масло двс',
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
    ]
  },
  {
    id: 'suspension',
    keywords: [
      'подвеска', 'suspension',
      'стойка', 'strut', 'амортизатор', 'shock', 'амортизатор подвески', 'амортизатор стойки',
      'пружина', 'spring',
      'рычаг', 'arm', 'lever',
      'сайлентблок', 'silent block', 'втулка', 'bushing',
      'опора', 'support', 'mount',
      'стабилизатор', 'stabilizer',
      'тяга', 'rod', 'link',
      'шаровая', 'ball joint',
      'подшипник', 'bearing',
      'ступица', 'hub',
      'подвесной', 'suspension',
      'подшипник ступицы', 'ступичный подшипник',
      'опора стойки', 'опорный подшипник стойки'
    ]
  },
  {
    id: 'brakes',
    keywords: [
      'тормоз', 'brake',
      'колодка', 'колодки', 'pad', 'колодки тормозные',
      'диск', 'rotor', 'disc', 'тормозной диск', 'диск тормозной',
      'суппорт', 'caliper',
      'тормозной', 'braking',
      'тормозная жидкость', 'brake fluid',
      'шланг', 'hose',
      'цилиндр', 'cylinder',
      'тормозной барабан', 'drum',
      'трос ручника', 'трос стояночного тормоза'
    ]
  }
];

function detectCategory(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();

  const scores = CATEGORIES.map((cat) => {
    const score = cat.keywords.reduce((sum, keyword) => {
      const kw = keyword.toLowerCase();
      // Для простоты учитываем вхождение подстроки, без word-boundary,
      // чтобы корректно работать и с кириллицей, и с латиницей.
      return sum + (text.includes(kw) ? 1 : 0);
    }, 0);
    return { id: cat.id, score };
  });

  const best = scores.reduce((best, cur) => (cur.score > best.score ? cur : best), scores[0]);
  return best && best.score > 0 ? best.id : null;
}

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill of part categories...');

  const parts = await prisma.part.findMany({
    where: {
      category: 'other'
    },
    select: {
      id: true,
      title: true,
      description: true
    }
  });

  console.log(`Found ${parts.length} parts without specific category.`);

  for (const part of parts) {
    const detected = detectCategory(part.title, part.description || '');
    const category = detected || 'other';

    await prisma.part.update({
      where: { id: part.id },
      data: { category }
    });

    console.log(`Part ${part.id} -> category=${category}`);
  }

  console.log('Backfill completed.');
}

main()
  .catch((e) => {
    console.error('Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



