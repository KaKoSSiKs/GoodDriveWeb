# ⚡ Быстрое решение: Connection refused на localhost:3000

## Проблема

Nginx выдает ошибку:
```
connect() failed (111: Connection refused) while connecting to upstream
```

Это значит, что nginx настроен правильно, но приложение в Docker не запущено или не слушает на порту 3000.

## Решение

### 1. Проверить статус контейнеров

```bash
cd /opt/gooddrive/GoodDriveWeb
docker compose ps
```

Должны быть запущены:
- `gooddrive-mysql` - Healthy
- `gooddrive-app` - Running

### 2. Если контейнеры не запущены

```bash
# Запустить все сервисы
make prod
# или
docker compose up -d
```

### 3. Проверить, что приложение слушает на порту 3000

```bash
# Проверить изнутри контейнера
docker compose exec app netstat -tlnp | grep 3000

# Или проверить с хоста
curl http://localhost:3000
curl http://localhost:3000/api/health
```

### 4. Проверить логи приложения

```bash
# Посмотреть логи
docker compose logs app

# Посмотреть последние 50 строк
docker compose logs --tail=50 app
```

### 5. Если приложение не запускается

Возможные причины:

#### a) Ошибка при миграциях Prisma

```bash
# Проверить логи
docker compose logs app | grep -i "migrate\|prisma\|error"

# Запустить миграции вручную
docker compose exec app npx prisma migrate deploy
```

#### b) Ошибка подключения к БД

```bash
# Проверить подключение
docker compose exec app node scripts/test-db-connection.js

# Проверить переменные окружения
docker compose exec app env | grep DATABASE_URL
```

#### c) Приложение упало при старте

```bash
# Посмотреть полные логи
docker compose logs app

# Перезапустить контейнер
docker compose restart app
```

### 6. Если приложение запущено, но не отвечает

Проверить, что порт проброшен правильно:

```bash
# Проверить docker-compose.yml
grep -A 2 "ports:" docker-compose.yml

# Должно быть:
# ports:
#   - "3000:3000"
```

### 7. Проверить firewall

```bash
# Проверить, что порт 3000 не заблокирован
sudo netstat -tlnp | grep 3000
sudo iptables -L -n | grep 3000
```

## Типичные проблемы

### Проблема: Контейнер запускается, но сразу падает

**Решение:**
```bash
# Посмотреть логи
docker compose logs app

# Проверить healthcheck
docker compose ps
```

### Проблема: MySQL не готов

**Решение:**
```bash
# Проверить статус MySQL
docker compose ps mysql

# Должно быть: Healthy

# Если не Healthy, проверить логи
docker compose logs mysql
```

### Проблема: Приложение запускается, но порт не проброшен

**Решение:**
Убедитесь, что в `docker-compose.yml` есть:
```yaml
app:
  ports:
    - "3000:3000"
```

## Быстрая диагностика

```bash
# 1. Статус всех контейнеров
docker compose ps

# 2. Логи приложения
docker compose logs --tail=100 app

# 3. Проверка порта
curl -v http://localhost:3000

# 4. Проверка health endpoint
curl http://localhost:3000/api/health
```

## После исправления

Когда приложение заработает:

1. Проверить локально:
   ```bash
   curl http://localhost:3000
   ```

2. Проверить через nginx:
   ```bash
   curl http://nikitintex.ru
   ```

3. Проверить логи nginx (не должно быть ошибок):
   ```bash
   sudo tail -f /var/log/nginx/nikitintex.ru.error.log
   ```

