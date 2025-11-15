# 🔧 Troubleshooting Guide

## Проблемы с запуском

### 1. Порт 3306 уже занят

**Ошибка:**
```
Bind for 0.0.0.0:3306 failed: port is already allocated
```

**Решение:**

1. **Вариант 1 (рекомендуется для production):** Убрать проброс порта MySQL наружу
   - В `docker-compose.yml` закомментировать `ports: - "3306:3306"`
   - MySQL будет доступен только внутри Docker сети

2. **Вариант 2:** Использовать другой порт
   ```yaml
   ports:
     - "3307:3306"  # Внешний порт 3307, внутренний 3306
   ```

3. **Вариант 3:** Остановить MySQL на хосте
   ```bash
   sudo systemctl stop mysql
   # или
   sudo service mysql stop
   ```

### 2. MySQL healthcheck failed

**Ошибка:**
```
dependency failed to start: container gooddrive-mysql is unhealthy
```

**Решение:**

1. Проверить логи MySQL:
   ```bash
   docker compose logs mysql
   ```

2. Проверить, что MySQL запустился:
   ```bash
   docker compose ps mysql
   ```

3. Увеличить `start_period` в healthcheck (если MySQL долго инициализируется):
   ```yaml
   healthcheck:
     start_period: 60s  # Увеличить с 40s до 60s
   ```

4. Проверить, что пароль в healthcheck совпадает с `MYSQL_ROOT_PASSWORD`

### 3. Orphan контейнеры

**Ошибка:**
```
Found orphan containers ([gooddrive-mysql-fixer gooddrive-db])
```

**Решение:**

```bash
# Удалить orphan контейнеры
docker compose down --remove-orphans

# Или использовать команду из Makefile
make clean-orphans
```

### 4. Приложение не подключается к БД

**Ошибка:**
```
Error: P1001: Can't reach database server
```

**Решение:**

1. Проверить, что MySQL запущен:
   ```bash
   docker compose ps mysql
   ```

2. Проверить DATABASE_URL:
   ```bash
   docker compose exec app env | grep DATABASE_URL
   ```

3. Проверить подключение:
   ```bash
   docker compose exec app node scripts/test-db-connection.js
   ```

4. Проверить логи MySQL:
   ```bash
   docker compose logs mysql
   ```

### 5. Nginx 502 Bad Gateway

**Ошибка:**
```
502 Bad Gateway
```

**Решение:**

1. Проверить, что приложение запущено:
   ```bash
   docker compose ps app
   ```

2. Проверить логи приложения:
   ```bash
   docker compose logs app
   ```

3. Проверить логи nginx:
   ```bash
   docker compose logs nginx
   ```

4. Проверить health check:
   ```bash
   curl http://localhost/api/health
   ```

### 6. Ошибки при сборке Docker образа

**Ошибка:**
```
failed to solve: failed to compute cache key
```

**Решение:**

1. Проверить, что все файлы на месте:
   ```bash
   ls -la package.json prisma/ src/ static/
   ```

2. Очистить Docker кеш:
   ```bash
   docker compose build --no-cache
   ```

3. Проверить `.dockerignore` - возможно, исключаются нужные файлы

### 7. Ошибки при импорте данных

**Ошибка:**
```
CSV файл не найден
```

**Решение:**

1. Проверить, что CSV файл существует:
   ```bash
   ls -la docker/mysql/data.csv
   ```

2. Проверить монтирование volume в docker-compose.yml

3. Запустить импорт вручную:
   ```bash
   docker compose exec app node scripts/import-data.js
   ```

### 8. Проблемы с правами доступа

**Ошибка:**
```
Permission denied
```

**Решение:**

1. Проверить права на файлы:
   ```bash
   ls -la docker/mysql/
   ```

2. Исправить права (если нужно):
   ```bash
   chmod 644 docker/mysql/01-init.sql
   chmod 644 docker/mysql/data.csv
   ```

### 9. Контейнеры не останавливаются

**Решение:**

```bash
# Принудительная остановка
docker compose kill

# Удаление контейнеров
docker compose rm -f
```

### 10. Volumes не удаляются

**Решение:**

```bash
# Удалить все volumes проекта
docker compose down -v

# Удалить конкретный volume
docker volume rm gooddriveweb_mysql_data
```

## Полезные команды для диагностики

```bash
# Статус всех контейнеров
docker compose ps

# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f mysql
docker compose logs -f app
docker compose logs -f nginx

# Войти в контейнер
docker compose exec app sh
docker compose exec mysql bash

# Проверить использование ресурсов
docker stats

# Проверить использование диска
docker system df

# Проверить сеть
docker network inspect gooddriveweb_gooddrive-network
```

## Частые проблемы и решения

### MySQL долго запускается

Увеличить `start_period` в healthcheck до 60-90 секунд.

### Приложение не видит изменения в коде

В production это нормально - код собирается в образ. Для изменений нужно пересобрать образ.

### Не хватает памяти

Уменьшить `innodb-buffer-pool-size` в MySQL или увеличить память Docker.

### Проблемы с кодировкой

Убедиться, что MySQL использует `utf8mb4`:
```yaml
command: >
  --character-set-server=utf8mb4
  --collation-server=utf8mb4_unicode_ci
```

## Полная переустановка

Если ничего не помогает:

```bash
# Остановить все
docker compose down -v

# Удалить образы
docker compose down --rmi all

# Очистить все
docker system prune -a --volumes

# Запустить заново
make prod
```

**ВНИМАНИЕ:** Это удалит все данные! Используйте только если нужно начать с чистого листа.

