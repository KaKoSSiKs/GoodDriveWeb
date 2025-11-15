# 🔄 ИНСТРУКЦИЯ ПО ПЕРЕСБОРКЕ КОНТЕЙНЕРОВ

## ✅ Что сделано

1. ✅ Захардкожены пароли MySQL в `docker-compose.yml`:
   - `MYSQL_ROOT_PASSWORD: FVhVbc_6jdmgCBR2R_Vf`
   - `MYSQL_PASSWORD: o7E-PX1P0t32vs3m-z`
   - `MYSQL_USER: gooddrive_user`
   - `MYSQL_DATABASE: gooddrive_db`

2. ✅ Обновлен healthcheck с правильным паролем root

3. ✅ Обновлен `DATABASE_URL` в app сервисе

4. ✅ Обновлен `docker/mysql/01-init.sql` с правильным паролем пользователя

## 🚀 КОМАНДЫ ДЛЯ ПЕРЕСБОРКИ

### ШАГ 1: Остановить и удалить контейнеры

```bash
docker compose down
```

### ШАГ 2: Удалить volume с данными MySQL (ВАЖНО!)

```bash
docker volume rm gooddriveweb_mysql_data
```

**ВНИМАНИЕ:** Это удалит все данные в MySQL! Но это нужно, чтобы MySQL создался с новыми паролями.

### ШАГ 3: Пересобрать и запустить

```bash
docker compose build --no-cache
docker compose up -d
```

### ШАГ 4: Проверить логи

```bash
# Проверить MySQL
docker compose logs mysql

# Проверить приложение
docker compose logs app
```

### ШАГ 5: Дождаться готовности и проверить

```bash
# Проверить статус
docker compose ps

# Проверить healthcheck
docker compose exec mysql mysqladmin ping -h localhost -u root -pFVhVbc_6jdmgCBR2R_Vf
```

## 📦 После пересборки

MySQL автоматически:
1. Создаст базу данных `gooddrive_db`
2. Создаст пользователя `gooddrive_user` с паролем `o7E-PX1P0t32vs3m-z`
3. Настроит правильный плагин аутентификации

Приложение автоматически:
1. Применит миграции Prisma
2. Импортирует данные из CSV (если они еще не импортированы)

## ✅ Проверка

```bash
# Проверить подключение к MySQL
docker compose exec mysql mysql -u gooddrive_user -po7E-PX1P0t32vs3m-z -e "SHOW DATABASES;"

# Проверить приложение
curl http://localhost:3000/api/health
```

---

**Готово!** Теперь MySQL создастся с правильными паролями.

