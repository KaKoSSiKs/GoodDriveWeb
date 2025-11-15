# 📁 Структура репозитория

## Обзор

Проект организован по принципу разделения ответственности: Docker конфигурации, исходный код, документация и скрипты разделены по отдельным директориям.

## Дерево директорий

```
GoodDriveWeb/
├── docker/                          # Docker конфигурации
│   ├── app/
│   │   ├── Dockerfile              # Production Dockerfile (multi-stage)
│   │   └── Dockerfile.dev          # Development Dockerfile
│   ├── nginx/
│   │   └── nginx.conf              # Nginx reverse proxy конфигурация
│   └── mysql/
│       ├── 01-init.sql             # MySQL инициализация (создание БД, пользователя)
│       └── data.csv                 # CSV данные для импорта (4000+ строк)
│
├── src/                             # Исходный код SvelteKit
│   ├── lib/                        # Библиотеки и утилиты
│   │   ├── components/            # Svelte компоненты
│   │   ├── server/                # Server-side код (auth, db, validators)
│   │   ├── stores/              # Svelte stores
│   │   └── utils/                 # Утилиты
│   ├── routes/                     # SvelteKit routes
│   │   ├── api/                   # API endpoints
│   │   ├── admin/                  # Admin панель
│   │   └── ...                    # Публичные страницы
│   └── ...
│
├── static/                          # Статические файлы
│   ├── images/                     # Изображения
│   ├── icons/                      # Иконки
│   └── ...
│
├── prisma/                          # Prisma ORM
│   ├── schema.prisma               # Схема базы данных
│   ├── migrations/                 # Миграции
│   └── seed.js                    # Seed скрипт
│
├── scripts/                         # Утилиты и скрипты
│   ├── import-data.js              # Импорт CSV в БД
│   ├── create-admin.js             # Создание admin пользователя
│   ├── test-db-connection.js      # Тест подключения к БД
│   └── ...
│
├── documentation/                   # Документация
│   ├── DEPLOYMENT.md               # Руководство по развертыванию
│   ├── QUICK_START.md              # Быстрый старт
│   ├── ENV_SETUP.md                # Настройка переменных окружения
│   └── ...
│
├── build/                           # Собранное приложение (генерируется)
├── node_modules/                    # Зависимости (генерируется)
│
├── docker-compose.yml               # Production конфигурация Docker Compose
├── docker-compose.dev.yml           # Development конфигурация
├── .env.example                     # Пример переменных окружения
├── .dockerignore                    # Исключения для Docker build
├── Makefile                         # Команды управления
├── package.json                     # Node.js зависимости
└── README.md                        # Основная документация
```

## Описание директорий

### `/docker`

Содержит все Docker-связанные конфигурации:

- **`app/`** - Dockerfile для сборки SvelteKit приложения
  - `Dockerfile` - Production build (multi-stage, оптимизирован)
  - `Dockerfile.dev` - Development build (с hot-reload)

- **`nginx/`** - Конфигурация Nginx reverse proxy
  - `nginx.conf` - Проксирование на app:3000, кэширование статики

- **`mysql/`** - MySQL инициализация
  - `01-init.sql` - Создание БД и пользователя
  - `data.csv` - CSV данные для импорта (копия из корня)

### `/src`

Исходный код SvelteKit приложения:

- **`lib/`** - Переиспользуемый код
  - `components/` - Svelte компоненты
  - `server/` - Server-side логика (auth, db, validators)
  - `stores/` - Svelte stores для состояния
  - `utils/` - Утилиты (API, SEO, категории)

- **`routes/`** - SvelteKit routes (file-based routing)
  - `api/` - API endpoints
  - `admin/` - Admin панель
  - Публичные страницы (catalog, cart, checkout, etc.)

### `/static`

Статические файлы, которые копируются как есть:

- Изображения товаров
- Иконки
- Manifest для PWA
- Service worker

### `/prisma`

Prisma ORM конфигурация:

- `schema.prisma` - Схема базы данных
- `migrations/` - История миграций
- `seed.js` - Скрипт для заполнения тестовыми данными

### `/scripts`

Утилиты и скрипты для разработки и деплоя:

- `import-data.js` - Импорт CSV в БД через Prisma
- `create-admin.js` - Создание admin пользователя
- `test-db-connection.js` - Тест подключения к БД
- Другие утилиты

### `/documentation`

Вся документация проекта:

- Руководства по развертыванию
- Настройка окружения
- Best practices
- API документация

## Файлы конфигурации

### `docker-compose.yml`

Production конфигурация с тремя сервисами:
- `mysql` - База данных
- `app` - SvelteKit приложение
- `nginx` - Reverse proxy

### `docker-compose.dev.yml`

Development конфигурация:
- `mysql` - База данных
- `app` - SvelteKit dev server с hot-reload
- `phpmyadmin` - Управление БД (только для dev)

### `.env.example`

Шаблон переменных окружения. Копируется в `.env` (не коммитится).

### `Makefile`

Удобные команды для управления проектом:
- `make prod` - Production запуск
- `make dev` - Development запуск
- `make logs` - Просмотр логов
- И другие

## Принципы организации

1. **Разделение по типу**: Docker, исходный код, документация разделены
2. **Production-ready**: Все конфигурации оптимизированы для продакшена
3. **Чистота**: Лишние файлы исключены через `.dockerignore`
4. **Документированность**: Каждая директория имеет назначение

## Изменения в структуре

### Было (старая структура):
- Dockerfile в корне
- nginx.conf в корне
- CSV файлы в корне
- Документация разбросана

### Стало (новая структура):
- Все Docker файлы в `/docker`
- Документация в `/documentation`
- CSV в `/docker/mysql`
- Чистая структура для продакшена

