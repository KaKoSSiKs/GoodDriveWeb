# GoodDrive - SvelteKit 5 + Prisma + MySQL

Монолитное full-stack приложение для интернет-магазина автозапчастей.



## 🚀 Технологии


- **Frontend/Backend**: SvelteKit 5
- **Database**: MySQL
- **ORM**: Prisma
- **Auth**: JWT (jsonwebtoken)
- **UI**: Tailwind CSS + Lucide Icons
- **Runtime**: Node.js 20+

## 📦 Установка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите параметры MySQL:

```env
DATABASE_URL="mysql://user:password@localhost:3306/gooddrive"
JWT_SECRET="your-secret-key"
```

### 3. Инициализация базы данных

```bash
# Применить миграции Prisma
npx prisma migrate dev --name init

# Сгенерировать Prisma Client
npx prisma generate
```

## 🔄 Миграция данных из PostgreSQL

Если у вас есть данные в PostgreSQL (Django), выполните миграцию:

### Шаг 1: Экспорт данных из PostgreSQL

Перейдите в директорию Django backend и выполните:

```bash
cd ../backend
python ../gooddrive-sveltekit/scripts/export-from-postgres.py
```

Это создаст файл `scripts/exported-data.json` с данными.

### Шаг 2: Импорт в MySQL

```bash
node scripts/migrate-data.js
```

## 🏃 Запуск

### Development

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

## 📋 Структура проекта

```
gooddrive-sveltekit/
├── prisma/
│   └── schema.prisma          # Схема БД
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── auth.ts        # Аутентификация
│   │   │   └── db.ts          # Prisma client
│   │   └── types.ts           # TypeScript типы
│   ├── routes/
│   │   ├── api/               # API endpoints
│   │   │   ├── auth/
│   │   │   ├── brands/
│   │   │   ├── parts/
│   │   │   ├── orders/
│   │   │   └── ...
│   │   ├── catalog/           # Страница каталога
│   │   ├── cart/              # Корзина
│   │   ├── admin/             # Админ панель
│   │   └── +layout.svelte     # Главный layout
│   ├── app.css                # Стили
│   └── hooks.server.ts        # Server hooks (auth)
├── scripts/
│   ├── export-from-postgres.py
│   └── migrate-data.js
└── package.json
```

## 🔑 API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `GET /api/auth/verify` - Проверка токена

### Каталог
- `GET /api/brands` - Список брендов
- `GET /api/warehouses` - Список складов
- `GET /api/parts` - Список запчастей (с фильтрами)
- `GET /api/parts/[id]` - Информация о запчасти

### Заказы
- `GET /api/orders` - Список заказов (admin)
- `POST /api/orders` - Создать заказ
- `GET /api/orders/[id]` - Информация о заказе

## 🔒 Аутентификация

Используется JWT токен, хранящийся в httpOnly cookie.

### Создание первого администратора

```bash
npx prisma studio
```

Откройте таблицу `users` и создайте пользователя вручную (пароль нужно захешировать bcrypt).

Или используйте seed скрипт (создайте `prisma/seed.js`).

## 🚀 Деплой

### Vercel + PlanetScale

1. Подключите MySQL на PlanetScale
2. Добавьте `DATABASE_URL` в Vercel Environment Variables
3. Deploy!

### VPS (Ubuntu/Debian)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt-get install mysql-server

# Clone and setup
git clone <repo>
cd gooddrive-sveltekit
npm install
npx prisma migrate deploy
npm run build

# Run with PM2
npm install -g pm2
pm2 start build/index.js --name gooddrive
```

## 📝 Полезные команды

```bash
# Prisma
npx prisma studio          # GUI для БД
npx prisma migrate dev     # Создать миграцию
npx prisma generate        # Обновить Prisma Client

# Development
npm run dev                # Dev server
npm run build              # Production build
npm run preview            # Preview production

# Database
npm run db:seed            # Заполнить тестовыми данными
```

---

## 📚 Документация и руководства

### 🎯 Новое! Comprehensive Documentation

В папке `/documentation` доступны детальные руководства:

**Обязательно к прочтению:**
- **[AUDIT_SUMMARY.md](./documentation/AUDIT_SUMMARY.md)** - 📊 Итоговый отчет аудита
- **[IMPLEMENTATION_PLAN.md](./documentation/IMPLEMENTATION_PLAN.md)** - 🚀 План внедрения улучшений

**Специализированные guides:**
- **[SEO_AUDIT.md](./documentation/SEO_AUDIT.md)** - 🔍 Полный SEO аудит (7,200+ слов)
- **[PERFORMANCE_GUIDE.md](./documentation/PERFORMANCE_GUIDE.md)** - ⚡ Performance optimization (5,800+ слов)
- **[PWA_ASSETS_GUIDE.md](./documentation/PWA_ASSETS_GUIDE.md)** - 📱 Создание PWA assets (4,500+ слов)
- **[ACCESSIBILITY_GUIDE.md](./documentation/ACCESSIBILITY_GUIDE.md)** - ♿ A11y improvements (5,200+ слов)

**Классическая документация:**
- [QUICK_START.md](./documentation/QUICK_START.md) - Быстрый старт
- [CHANGES.md](./documentation/CHANGES.md) - Журнал изменений
- [RECOMMENDATIONS.md](./documentation/RECOMMENDATIONS.md) - Рекомендации

**Всего:** 26,800+ слов комплексной документации по SEO, Performance, PWA, и Accessibility!

### 🎯 Начните здесь:

1. Прочитайте [AUDIT_SUMMARY.md](./documentation/AUDIT_SUMMARY.md) для понимания текущего состояния
2. Следуйте [IMPLEMENTATION_PLAN.md](./documentation/IMPLEMENTATION_PLAN.md) для поэтапного улучшения проекта

---

## ✅ Последние улучшения (12 ноября 2025)

### Security ✅
- Добавлены критичные security headers (CSP, HSTS, X-Frame-Options, etc)
- Настроена CORS policy
- Защита от XSS, clickjacking, MIME sniffing

### Performance ✅
- Включена Brotli/Gzip compression (`precompress: true`)
- Оптимизирована загрузка шрифтов (font-display: swap)
- Добавлен preconnect для внешних ресурсов
- Настроен prerendering для SEO

### SEO ✅
- Улучшены meta tags и Open Graph
- Добавлена поддержка FAQ Schema
- Placeholders для verification кодов
- Расширенные robots directives

### Documentation ✅
- Создано 6 comprehensive guides (26,800+ слов)
- Детальный 6-недельный implementation plan
- 100+ code examples
- Testing strategies и best practices

### Профессиональные рекомендации 🎯

**ВАЖНО!** Прочитайте профессиональный код-ревью:
- **[PROFESSIONAL_RECOMMENDATIONS.md](./PROFESSIONAL_RECOMMENDATIONS.md)** - 📋 Профессиональные рекомендации по разработке
- **[CODE_REVIEW.md](./documentation/CODE_REVIEW.md)** - 🔍 Детальный код-ревью с примерами

**Критичные проблемы (исправлено):**
- ✅ **JWT_SECRET** - убрано дефолтное значение, добавлена проверка
- ✅ **Hardcoded URLs** - исправлено в sitemap, RSS, SEO utils
- ✅ **Security Headers** - CSP, HSTS, X-Frame-Options добавлены
- ✅ **Input validation** - добавлена Zod валидация во все API endpoints
- ✅ **Error handling** - централизованная обработка ошибок и логирование
- ✅ **Rate limiting** - защита API от атак (100 req/min для API, 5 req/15min для auth)
- ✅ **Image Sitemap** - добавлен Image Sitemap для SEO
- ✅ **Database indexes** - добавлены индексы для оптимизации запросов
- ✅ **Image optimization** - lazy loading и ARIA labels для изображений
- ✅ **Accessibility** - улучшена accessibility с ARIA labels

**См. подробный отчет:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

### Что дальше? 🚀

См. [IMPLEMENTATION_PLAN.md](./documentation/IMPLEMENTATION_PLAN.md) для следующих шагов:
1. **Database Migration** (5 мин) - Выполнить миграцию для создания индексов
2. **PWA Assets** (2-3 часа) - Создать иконки и favicons
3. **Image Optimization** (4-6 часов) - Sharp integration для оптимизации изображений
4. **Redis для Rate Limiting** (1-2 часа) - Заменить in-memory на Redis для production
5. **Pino для логирования** (30 мин) - Заменить simple logger на pino
6. **Analytics Setup** (1 час) - Настроить Yandex.Metrika & GA4
7. **Sentry для мониторинга** (1 час) - Настроить отслеживание ошибок

## 🛠️ Разработка

### Добавление новой модели

1. Обновите `prisma/schema.prisma`
2. Создайте миграцию: `npx prisma migrate dev --name add_model`
3. Создайте API endpoint в `src/routes/api/`
4. Создайте frontend страницу

### Изменение схемы БД

```bash
npx prisma migrate dev --name change_description
```

## 📄 Лицензия

Частный проект.

