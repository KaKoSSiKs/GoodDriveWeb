# 🚀 Руководство по развертыванию

## Структура проекта

```
GoodDriveWeb/
├── docker/
│   ├── app/
│   │   ├── Dockerfile          # Production Dockerfile
│   │   └── Dockerfile.dev      # Development Dockerfile
│   ├── nginx/
│   │   └── nginx.conf          # Nginx конфигурация
│   └── mysql/
│       ├── 01-init.sql         # MySQL инициализация
│       └── data.csv            # CSV данные для импорта
├── docker-compose.yml          # Production конфигурация
├── docker-compose.dev.yml      # Development конфигурация
├── .env.example                # Пример переменных окружения
└── documentation/              # Документация
```

## Быстрый старт

### 1. Подготовка

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd GoodDriveWeb

# Создайте .env файл
cp .env.example .env

# Отредактируйте .env и укажите:
# - MYSQL_ROOT_PASSWORD (безопасный пароль)
# - MYSQL_PASSWORD (безопасный пароль)
# - JWT_SECRET (сгенерируйте: openssl rand -base64 64)
# - PUBLIC_SITE_URL (ваш домен)
```

### 2. Запуск Production

```bash
# Собрать и запустить
make prod

# Или вручную:
docker compose up -d --build
```

### 3. Проверка

```bash
# Проверить статус
make status

# Посмотреть логи
make logs

# Открыть в браузере
# http://localhost (через nginx)
# http://localhost:3000 (напрямую к приложению)
```

## Архитектура

### Сервисы

1. **mysql** - MySQL 8.0 база данных
   - Порт: 3306
   - Volume: `mysql_data`
   - Автоматическая инициализация через `01-init.sql`

2. **app** - SvelteKit приложение
   - Порт: 3000 (внутренний)
   - Multi-stage build
   - Автоматические миграции Prisma
   - Импорт данных из CSV

3. **nginx** - Reverse proxy
   - Порт: 80 (HTTP), 443 (HTTPS)
   - Проксирует запросы на `app:3000`
   - Кэширование статики

### Сети

- `gooddrive-network` - внутренняя сеть для всех сервисов

### Volumes

- `mysql_data` - данные MySQL
- `certbot_data` - данные для Let's Encrypt
- `certbot_etc` - SSL сертификаты

## Импорт данных

Данные из CSV (`docker/mysql/data.csv`) импортируются автоматически при первом запуске через скрипт `scripts/import-data.js`.

### Настройка импорта

В `.env` файле:

```env
# Импортировать все строки (по умолчанию)
IMPORT_LIMIT=0

# Импортировать первые 100 строк
IMPORT_LIMIT=100

# Принудительный импорт (даже если данные уже есть)
FORCE_IMPORT=true
```

### Ручной импорт

```bash
# Войти в контейнер
docker compose exec app sh

# Запустить импорт
node scripts/import-data.js
```

## Настройка SSL (HTTPS)

### 1. Установка Certbot

```bash
# На хосте (не в контейнере)
sudo apt-get update
sudo apt-get install certbot

# Получить сертификат
sudo certbot certonly --webroot \
  -w ./certbot_data \
  -d your-domain.com \
  -d www.your-domain.com
```

### 2. Обновить nginx.conf

Раскомментировать HTTPS секцию в `docker/nginx/nginx.conf` и указать правильный домен.

### 3. Перезапустить nginx

```bash
docker compose restart nginx
```

## Развертывание на сервере

### 1. Подготовка сервера

```bash
# Установить Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin
```

### 2. Клонировать проект

```bash
git clone <repository-url>
cd GoodDriveWeb
```

### 3. Настроить .env

```bash
cp .env.example .env
nano .env
```

### 4. Запустить

```bash
docker compose up -d --build
```

### 5. Настроить домен

Обновите DNS записи, чтобы указывать на IP сервера.

## Мониторинг

### Логи

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f app
docker compose logs -f mysql
docker compose logs -f nginx
```

### Health checks

```bash
# Проверить здоровье
docker compose ps

# Health check endpoint
curl http://localhost/api/health
```

## Обновление

```bash
# Остановить
docker compose down

# Обновить код
git pull

# Пересобрать и запустить
docker compose up -d --build
```

## Резервное копирование

### База данных

```bash
# Создать бэкап
docker compose exec mysql mysqldump -u root -p gooddrive_db > backup.sql

# Восстановить
docker compose exec -T mysql mysql -u root -p gooddrive_db < backup.sql
```

## Устранение неполадок

### Приложение не запускается

1. Проверить логи: `docker compose logs app`
2. Проверить подключение к БД: `docker compose exec app node scripts/test-db-connection.js`
3. Проверить переменные окружения: `docker compose exec app env | grep DATABASE_URL`

### Nginx 502 Bad Gateway

1. Проверить, что приложение запущено: `docker compose ps`
2. Проверить логи nginx: `docker compose logs nginx`
3. Проверить логи приложения: `docker compose logs app`

### База данных не подключается

1. Проверить статус MySQL: `docker compose ps mysql`
2. Проверить логи: `docker compose logs mysql`
3. Проверить переменные окружения: `docker compose exec mysql env | grep MYSQL`

## Дополнительная документация

- [QUICK_START.md](./QUICK_START.md) - Быстрый старт для разработки
- [ENV_SETUP.md](./ENV_SETUP.md) - Настройка переменных окружения
- [DOCKER_README.md](./DOCKER_README.md) - Подробная документация по Docker
