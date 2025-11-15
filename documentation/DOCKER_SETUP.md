# 🚀 Быстрая настройка Docker

## 📋 Что было создано

1. **Dockerfile** - Production образ для SvelteKit приложения
2. **docker-compose.yml** - Конфигурация для двух контейнеров (app + db)
3. **scripts/import-data.js** - Скрипт импорта CSV и загрузки изображений
4. **.env.example** - Пример переменных окружения
5. **.dockerignore** - Исключения для Docker build
6. **src/routes/api/health/+server.ts** - Health check endpoint

## 🎯 Быстрый старт

### 1. Создайте .env файл

```bash
cp .env.example .env
```

Отредактируйте `.env` и настройте:
- `DATABASE_URL` - подключение к MySQL
- `MYSQL_ROOT_PASSWORD` - пароль root для MySQL
- `MYSQL_USER` и `MYSQL_PASSWORD` - пользователь и пароль для приложения
- `JWT_SECRET` - секретный ключ для JWT (сгенерируйте: `openssl rand -base64 64`)
- `IMPORT_LIMIT` - лимит импорта (по умолчанию 100)

### 2. Запустите контейнеры

```bash
docker compose up --build
```

### 3. Проверьте работу

- Приложение: http://localhost:3000
- База данных: localhost:3306

## ⚙️ Настройка лимита импорта

### В .env файле:
```env
# Импортировать первые 100 строк (по умолчанию)
IMPORT_LIMIT=100

# Импортировать все строки
IMPORT_LIMIT=0

# Импортировать первые 1000 строк
IMPORT_LIMIT=1000
```

### В scripts/import-data.js:
Измените значение по умолчанию в строке 29:
```javascript
IMPORT_LIMIT: parseInt(process.env.IMPORT_LIMIT || '100', 10),
```

### При запуске:
```bash
# Импортировать 500 строк
IMPORT_LIMIT=500 docker compose up --build

# Импортировать все строки
IMPORT_LIMIT=0 docker compose up --build
```

## 📊 Процесс запуска

При первом запуске автоматически выполняется:

1. **Миграции Prisma** - создание структуры БД
2. **Импорт данных** - импорт CSV (только если данных нет)
3. **Загрузка изображений** - скачивание и сохранение изображений
4. **Запуск приложения** - старт SvelteKit сервера

## 🔄 Повторный импорт

Скрипт автоматически пропускает импорт, если данные уже есть в БД.

Для принудительного импорта:
```bash
FORCE_IMPORT=true docker compose up --build
```

Или в `.env`:
```env
FORCE_IMPORT=true
```

## 📝 Логирование

Все шаги импорта логируются:
- ✅ Успешные операции
- ⚠️ Предупреждения
- ❌ Ошибки
- 📊 Статистика импорта

Просмотр логов:
```bash
docker compose logs -f app
```

## 🔍 Полезные команды

```bash
# Остановка контейнеров
docker compose down

# Просмотр логов
docker compose logs -f

# Выполнение команд в контейнере
docker compose exec app sh

# Ручной импорт данных
docker compose exec app node scripts/import-data.js

# Prisma Studio
docker compose exec app npx prisma studio
```

## 📚 Подробная документация

См. [DOCKER_README.md](./DOCKER_README.md) для полной документации.

