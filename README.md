# GoodDrive - Интернет-магазин автозапчастей

Полнофункциональный интернет-магазин автозапчастей на SvelteKit 5 с MySQL базой данных.

## 🚀 Быстрый старт

### Требования

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (для локальной разработки)

### Запуск Production

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd GoodDriveWeb

# 2. Создать .env файл
cp .env.example .env
# Отредактировать .env и указать пароли и настройки

# 3. Запустить
make prod
# или
docker compose up -d --build
```

Приложение будет доступно по адресу: http://localhost

### Запуск Development

```bash
make dev
# или
docker compose -f docker-compose.dev.yml up -d
```

## 📁 Структура проекта

```
GoodDriveWeb/
├── docker/                    # Docker конфигурации
│   ├── app/
│   │   ├── Dockerfile        # Production Dockerfile
│   │   └── Dockerfile.dev    # Development Dockerfile
│   ├── nginx/
│   │   └── nginx.conf        # Nginx конфигурация
│   └── mysql/
│       ├── 01-init.sql      # MySQL инициализация
│       └── data.csv         # CSV данные для импорта
├── src/                      # Исходный код SvelteKit
├── static/                   # Статические файлы
├── prisma/                   # Prisma схема и миграции
├── scripts/                  # Утилиты и скрипты
├── documentation/            # Документация
├── docker-compose.yml        # Production конфигурация
├── docker-compose.dev.yml    # Development конфигурация
├── .env.example              # Пример переменных окружения
└── Makefile                  # Команды управления
```

## 🛠️ Команды

```bash
make help      # Показать все команды
make build     # Собрать Docker образы
make up        # Запустить сервисы
make down      # Остановить сервисы
make logs      # Показать логи
make status    # Статус контейнеров
make dev       # Запустить в dev режиме
make prod      # Запустить в production режиме
```

## 📚 Документация

- [DEPLOYMENT.md](./documentation/DEPLOYMENT.md) - Руководство по развертыванию
- [QUICK_START.md](./documentation/QUICK_START.md) - Быстрый старт для разработки
- [ENV_SETUP.md](./documentation/ENV_SETUP.md) - Настройка переменных окружения

## 🏗️ Архитектура

### Сервисы

- **app** - SvelteKit приложение (Node.js)
- **mysql** - MySQL 8.0 база данных
- **nginx** - Reverse proxy и статика

### Технологии

- **Frontend/Backend**: SvelteKit 5
- **Database**: MySQL 8.0
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Deployment**: Docker + Docker Compose

## 🔧 Разработка

### Локальная разработка

```bash
# Установить зависимости
npm install

# Настроить .env
cp .env.example .env

# Применить миграции
npx prisma migrate dev

# Запустить dev сервер
npm run dev
```

### Docker разработка

```bash
make dev
```

## 📦 Импорт данных

Данные из CSV автоматически импортируются при первом запуске. Настройка в `.env`:

```env
IMPORT_LIMIT=0        # 0 = все строки
FORCE_IMPORT=false    # true = принудительный импорт
```

## 🔒 Безопасность

- Все секреты в `.env` файле
- `.env` не коммитится в Git
- JWT для аутентификации
- Rate limiting для API
- Валидация данных через Zod

## 📄 Лицензия

[Указать лицензию]

## 👥 Авторы

[Указать авторов]
