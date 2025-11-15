# ⚡ Быстрый старт

## Production развертывание

### 1. Клонирование и настройка

```bash
# Клонировать репозиторий
git clone <repository-url>
cd GoodDriveWeb

# Создать .env файл
cp .env.example .env

# Отредактировать .env (обязательно!)
nano .env
```

### 2. Настройка .env

Минимально необходимые переменные:

```env
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_password
JWT_SECRET=$(openssl rand -base64 64)
PUBLIC_SITE_URL=https://your-domain.com
```

### 3. Запуск

```bash
# Вариант 1: Через Makefile
make prod

# Вариант 2: Напрямую
docker compose up -d --build
```

### 4. Проверка

```bash
# Статус контейнеров
make status
# или
docker compose ps

# Логи
make logs
# или
docker compose logs -f

# Открыть в браузере
# http://localhost (через nginx)
```

## Development развертывание

```bash
# Запустить dev окружение
make dev

# Или
docker compose -f docker-compose.dev.yml up -d
```

Доступно:
- Приложение: http://localhost:3000
- PhpMyAdmin: http://localhost:8080

## Полезные команды

```bash
# Остановить все
make down

# Перезапустить
make restart

# Очистить все (включая volumes)
make clean

# Просмотр логов конкретного сервиса
docker compose logs -f app
docker compose logs -f mysql
docker compose logs -f nginx
```

## Импорт данных

Данные импортируются автоматически при первом запуске.

### Настройка импорта в .env:

```env
# Импортировать все строки (4000+)
IMPORT_LIMIT=0

# Импортировать первые 100 строк (для теста)
IMPORT_LIMIT=100

# Принудительный импорт
FORCE_IMPORT=true
```

### Ручной импорт

```bash
# Войти в контейнер
docker compose exec app sh

# Запустить импорт
node scripts/import-data.js
```

## Создание admin пользователя

```bash
docker compose exec app node scripts/create-admin.js
```

## Troubleshooting

### Приложение не запускается

```bash
# Проверить логи
docker compose logs app

# Проверить подключение к БД
docker compose exec app node scripts/test-db-connection.js
```

### Nginx 502 Bad Gateway

```bash
# Проверить статус приложения
docker compose ps app

# Проверить логи
docker compose logs app
docker compose logs nginx
```

### База данных не подключается

```bash
# Проверить статус MySQL
docker compose ps mysql

# Проверить логи
docker compose logs mysql

# Проверить переменные окружения
docker compose exec mysql env | grep MYSQL
```

## Следующие шаги

После успешного запуска:

1. Настроить SSL (HTTPS) - см. [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Создать admin пользователя
3. Настроить домен и DNS
4. Настроить мониторинг
