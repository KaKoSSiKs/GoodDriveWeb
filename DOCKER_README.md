# 🐳 Docker Deployment Guide

Руководство по развертыванию монолитного SvelteKit приложения в Docker.

## 📋 Структура

- **Контейнер `db`**: MySQL 8.0 база данных
- **Контейнер `app`**: SvelteKit монолитное приложение

## 🚀 Быстрый старт

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и настройте переменные:

```bash
cp .env.example .env
```

Отредактируйте `.env` файл:

```env
# Database Configuration
DATABASE_URL=mysql://appuser:apppassword@db:3306/appdb

# MySQL Configuration
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=appdb
MYSQL_USER=appuser
MYSQL_PASSWORD=apppassword

# JWT Secret (сгенерируйте уникальный ключ)
JWT_SECRET=your-secret-key-change-in-production-minimum-32-characters

# Import Configuration
# Лимит на количество импортируемых строк (0 = все строки, по умолчанию 100)
IMPORT_LIMIT=100
# Принудительный импорт даже если данные уже есть (true/false)
FORCE_IMPORT=false
```

### 2. Сборка и запуск

```bash
# Сборка и запуск контейнеров
docker compose up --build

# Или в фоновом режиме
docker compose up -d --build
```

### 3. Проверка работы

После запуска приложение будет доступно по адресу:
- **Приложение**: http://localhost:3000
- **База данных**: localhost:3306

## 📊 Процесс запуска

При первом запуске контейнера `app` выполняется следующая последовательность:

1. **Применение миграций Prisma**
   ```bash
   npx prisma migrate deploy
   ```

2. **Импорт данных из CSV**
   ```bash
   node scripts/import-data.js
   ```
   - Импортирует данные из `db_of_catalog.csv`
   - Загружает изображения по URL (или генерирует placeholder)
   - Сохраняет изображения в `static/images/parts/`
   - По умолчанию импортирует первые 100 строк

3. **Запуск приложения**
   ```bash
   node build/index.js
   ```

## ⚙️ Настройка лимита импорта

Лимит на количество импортируемых строк настраивается через переменную окружения `IMPORT_LIMIT`:

### В `.env` файле:

```env
# Импортировать первые 100 строк (по умолчанию)
IMPORT_LIMIT=100

# Импортировать все строки
IMPORT_LIMIT=0

# Импортировать первые 1000 строк
IMPORT_LIMIT=1000
```

### При запуске через docker compose:

```bash
# Импортировать первые 500 строк
IMPORT_LIMIT=500 docker compose up --build

# Импортировать все строки
IMPORT_LIMIT=0 docker compose up --build

# Принудительный импорт (даже если данные уже есть)
FORCE_IMPORT=true docker compose up --build
```

### В `scripts/import-data.js`:

Можно изменить значение по умолчанию в начале файла:

```javascript
const CONFIG = {
  // Лимит на количество импортируемых строк (0 = все)
  IMPORT_LIMIT: parseInt(process.env.IMPORT_LIMIT || '100', 10),
  // ...
};
```

## 📁 Структура файлов

```
.
├── Dockerfile                 # Docker образ для приложения
├── docker-compose.yml         # Конфигурация Docker Compose
├── .dockerignore             # Исключения для Docker build
├── .env.example              # Пример переменных окружения
├── db_of_catalog.csv         # CSV файл с данными
├── scripts/
│   └── import-data.js        # Скрипт импорта данных и изображений
└── static/
    └── images/
        └── parts/            # Загруженные изображения товаров
```

## 🔧 Команды управления

### Запуск контейнеров

```bash
# Запуск в фоновом режиме
docker compose up -d

# Запуск с пересборкой
docker compose up --build

# Запуск с просмотром логов
docker compose up
```

### Остановка контейнеров

```bash
# Остановка контейнеров
docker compose down

# Остановка с удалением volumes (ОСТОРОЖНО: удалит данные БД!)
docker compose down -v
```

### Просмотр логов

```bash
# Логи всех контейнеров
docker compose logs -f

# Логи конкретного контейнера
docker compose logs -f app
docker compose logs -f db
```

### Выполнение команд в контейнере

```bash
# Выполнить команду в контейнере app
docker compose exec app sh

# Запустить импорт данных вручную
docker compose exec app node scripts/import-data.js

# Открыть Prisma Studio
docker compose exec app npx prisma studio
```

## 📊 Мониторинг

### Healthcheck

Оба контейнера имеют healthcheck:

- **db**: Проверяет доступность MySQL через `mysqladmin ping`
- **app**: Проверяет доступность приложения через `/api/health`

### Проверка статуса

```bash
# Статус контейнеров
docker compose ps

# Детальная информация
docker compose ps --format json
```

## 🗄️ База данных

### Подключение к MySQL

```bash
# Через docker compose
docker compose exec db mysql -u appuser -papppassword appdb

# Или через mysql клиент на хосте
mysql -h localhost -P 3306 -u appuser -papppassword appdb
```

### Резервное копирование

```bash
# Создать резервную копию
docker compose exec db mysqldump -u appuser -papppassword appdb > backup.sql

# Восстановить из резервной копии
docker compose exec -T db mysql -u appuser -papppassword appdb < backup.sql
```

### Данные сохраняются в Docker volume

```bash
# Просмотр volumes
docker volume ls

# Просмотр данных volume
docker volume inspect gooddrive_mysql_data
```

## 🖼️ Изображения

Изображения товаров сохраняются в `static/images/parts/` и монтируются как volume в контейнер.

### Формат имени файла

```
{partId}-{safeTitle}-{index}.jpg
```

Пример:
```
1-filtr-salon-vaz-1118-1.jpg
```

### Загрузка изображений

Скрипт `import-data.js`:
- Генерирует URL изображения на основе названия товара (placeholder.com)
- Загружает изображение по URL
- Сохраняет локально в `static/images/parts/`
- Сохраняет путь в базу данных

**Примечание**: Для использования реальных URL изображений из CSV, нужно:
1. Добавить колонку с URL в CSV файл
2. Модифицировать скрипт для чтения URL из CSV

## 🔒 Безопасность

### Production настройки

1. **Измените пароли** в `.env` файле
2. **Сгенерируйте JWT_SECRET**:
   ```bash
   openssl rand -base64 64
   ```
3. **Не коммитьте `.env` файл** в Git
4. **Используйте сильные пароли** для MySQL

### Переменные окружения

Все секретные данные должны быть в `.env` файле и не должны быть закоммичены в Git.

## 🐛 Решение проблем

### Ошибка подключения к БД

```bash
# Проверьте, что контейнер db запущен
docker compose ps

# Проверьте логи
docker compose logs db

# Проверьте DATABASE_URL в .env
```

### Ошибка импорта данных

```bash
# Проверьте наличие CSV файла
ls -la db_of_catalog.csv

# Проверьте логи импорта
docker compose logs app | grep "Импорт"

# Запустите импорт вручную
docker compose exec app node scripts/import-data.js
```

### Ошибка загрузки изображений

```bash
# Проверьте права доступа к папке static
ls -la static/images/parts/

# Проверьте логи загрузки
docker compose logs app | grep "Изображение"
```

### Пересборка контейнеров

```bash
# Полная пересборка без кеша
docker compose build --no-cache

# Удаление контейнеров и volumes (ОСТОРОЖНО!)
docker compose down -v
docker compose up --build
```

## 📝 Логирование

Скрипт импорта выводит детальные логи:

- ✅ Успешные операции
- ⚠️ Предупреждения
- ❌ Ошибки
- 📊 Статистика импорта

### Пример логов

```
🚀 Начинаем импорт данных из CSV...

📊 Конфигурация:
  - Лимит импорта: 100 строк
  - CSV файл: /app/db_of_catalog.csv
  - Папка изображений: /app/static/images/parts

📄 Всего строк в CSV: 6401

📦 Будет обработано: 100 товаров

  📷 [1/100] Загрузка изображения для: Фильтр салонa ВАЗ 1118...
    ✅ Изображение загружено: /images/parts/1-filtr-salon-vaz-1118-1.jpg

📊 Прогресс: 10/100 (10%)
  ✅ Создано: 10 | Обновлено: 0 | Пропущено: 0
  📷 Изображений: 10 загружено | 0 ошибок

✅ Импорт завершен!

📊 Итоговая статистика:
  📦 Брендов создано: 5
  🏭 Складов создано: 2
  ✅ Товаров создано: 100
  🔄 Товаров обновлено: 0
  ⏭️  Товаров пропущено: 0
  📷 Изображений загружено: 100
  ❌ Изображений не загружено: 0
  ⚠️  Ошибок: 0
```

## 🎯 Production Deployment

Для production развертывания на VPS:

1. **Настройте `.env` файл** с production значениями
2. **Используйте Nginx** как reverse proxy
3. **Настройте SSL** сертификаты (Let's Encrypt)
4. **Используйте Docker Compose** для управления контейнерами
5. **Настройте мониторинг** и логирование
6. **Регулярно создавайте резервные копии** базы данных

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)

