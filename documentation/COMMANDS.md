# 🚀 Команды для запуска проекта

## Быстрый старт

```bash
# 1. Клонировать и перейти в директорию
git clone <repository-url>
cd GoodDriveWeb

# 2. Создать .env файл
cp .env.example .env
nano .env  # Отредактировать пароли и настройки

# 3. Запустить production
make prod
```

## Основные команды

### Production

```bash
# Собрать и запустить
make prod

# Или вручную
docker compose up -d --build

# Остановить
make down
# или
docker compose down

# Перезапустить
make restart

# Просмотр логов
make logs
# или
docker compose logs -f

# Статус контейнеров
make status
# или
docker compose ps
```

### Development

```bash
# Запустить dev окружение
make dev

# Или
docker compose -f docker-compose.dev.yml up -d

# Остановить
docker compose -f docker-compose.dev.yml down
```

## Управление данными

### Импорт CSV

```bash
# Автоматический импорт при первом запуске
# Настройка в .env:
# IMPORT_LIMIT=0  # все строки
# FORCE_IMPORT=false

# Ручной импорт
docker compose exec app node scripts/import-data.js
```

### Создание admin пользователя

```bash
docker compose exec app node scripts/create-admin.js
```

### Резервное копирование БД

```bash
# Создать бэкап
docker compose exec mysql mysqldump -u root -p gooddrive_db > backup.sql

# Восстановить
docker compose exec -T mysql mysql -u root -p gooddrive_db < backup.sql
```

## Отладка

### Логи

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f app
docker compose logs -f mysql
docker compose logs -f nginx
```

### Вход в контейнеры

```bash
# Войти в app контейнер
docker compose exec app sh

# Войти в mysql контейнер
docker compose exec mysql bash

# Выполнить команду в контейнере
docker compose exec app node scripts/test-db-connection.js
```

### Проверка здоровья

```bash
# Health check endpoint
curl http://localhost/api/health

# Статус всех сервисов
docker compose ps
```

## Очистка

```bash
# Остановить и удалить контейнеры
make down

# Удалить контейнеры и volumes (ВНИМАНИЕ: удалит данные БД!)
make clean
# или
docker compose down -v

# Удалить образы
docker compose down --rmi all
```

## Обновление

```bash
# 1. Остановить
docker compose down

# 2. Обновить код
git pull

# 3. Пересобрать и запустить
docker compose up -d --build
```

## Troubleshooting

### Приложение не запускается

```bash
# Проверить логи
docker compose logs app

# Проверить подключение к БД
docker compose exec app node scripts/test-db-connection.js

# Проверить переменные окружения
docker compose exec app env | grep DATABASE_URL
```

### Nginx 502 Bad Gateway

```bash
# Проверить статус приложения
docker compose ps app

# Проверить логи
docker compose logs app
docker compose logs nginx

# Проверить, что app слушает порт 3000
docker compose exec app netstat -tlnp | grep 3000
```

### База данных не подключается

```bash
# Проверить статус MySQL
docker compose ps mysql

# Проверить логи
docker compose logs mysql

# Проверить переменные окружения
docker compose exec mysql env | grep MYSQL

# Проверить подключение из контейнера
docker compose exec app node scripts/test-db-connection.js
```

## Полезные команды

### Prisma

```bash
# Применить миграции
docker compose exec app npx prisma migrate deploy

# Prisma Studio (GUI для БД)
docker compose exec app npx prisma studio
# Откроется на http://localhost:5555 (нужно пробросить порт)
```

### MySQL

```bash
# Подключиться к MySQL
docker compose exec mysql mysql -u gooddrive_user -p gooddrive_db

# Выполнить SQL запрос
docker compose exec mysql mysql -u root -p -e "SHOW DATABASES;"
```

## Production на сервере

### Первоначальная настройка

```bash
# 1. Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin

# 2. Клонировать проект
git clone <repository-url>
cd GoodDriveWeb

# 3. Настроить .env
cp .env.example .env
nano .env

# 4. Запустить
docker compose up -d --build
```

### Настройка SSL (HTTPS)

```bash
# 1. Установить certbot
sudo apt-get install certbot

# 2. Получить сертификат
sudo certbot certonly --webroot \
  -w ./certbot_data \
  -d your-domain.com \
  -d www.your-domain.com

# 3. Обновить nginx.conf (раскомментировать HTTPS секцию)

# 4. Перезапустить nginx
docker compose restart nginx
```

## Мониторинг

### Ресурсы

```bash
# Использование ресурсов
docker stats

# Использование диска
docker system df
```

### Логи

```bash
# Последние 100 строк логов
docker compose logs --tail=100 app

# Логи за последний час
docker compose logs --since 1h app
```

