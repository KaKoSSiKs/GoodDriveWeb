# 🔧 Исправление ошибки аутентификации MySQL

## Проблема

Ошибка:
```
Authentication failed against database server at 'mysql', 
the provided database credentials for `gooddrive_user` are not valid.
```

## Причина

MySQL init скрипт выполняется только при первом запуске контейнера. Если volume уже существует, пользователь мог не создаться или создаться неправильно.

## Решение

### Вариант 1: Исправить пользователя в существующей БД (рекомендуется)

```bash
# 1. Войти в MySQL контейнер
docker compose exec mysql bash

# 2. Подключиться к MySQL как root
mysql -u root -prootpassword

# 3. Выполнить SQL команды
```

В MySQL консоли выполните:

```sql
-- Создать базу данных (если не существует)
CREATE DATABASE IF NOT EXISTS `gooddrive_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Удалить пользователя, если существует
DROP USER IF EXISTS 'gooddrive_user'@'%';

-- Создать пользователя с правильным плагином
CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';

-- Предоставить права
GRANT ALL PRIVILEGES ON `gooddrive_db`.* TO 'gooddrive_user'@'%';

-- Применить изменения
FLUSH PRIVILEGES;

-- Проверить
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';
```

Выход:
```sql
EXIT;
```

### Вариант 2: Использовать скрипт

```bash
# Скопировать скрипт в контейнер
docker compose cp scripts/fix-mysql-user-docker.sh mysql:/tmp/

# Выполнить скрипт
docker compose exec mysql sh /tmp/fix-mysql-user-docker.sh
```

### Вариант 3: Пересоздать БД (удалит все данные!)

```bash
# ОСТОРОЖНО: Это удалит все данные!
docker compose down -v
docker compose up -d
```

## Проверка

После исправления проверьте подключение:

```bash
# Проверить подключение из приложения
docker compose exec app node scripts/test-db-connection.js

# Или попробовать импорт снова
docker compose exec app node scripts/import-data.js
```

## Если пароли не совпадают

Если вы изменили пароли в `.env`, убедитесь, что они совпадают везде:

1. В `.env` файле:
   ```env
   MYSQL_USER=gooddrive_user
   MYSQL_PASSWORD=ваш_пароль
   ```

2. В `docker-compose.yml` (используются те же переменные)

3. В DATABASE_URL:
   ```env
   DATABASE_URL=mysql://gooddrive_user:ваш_пароль@mysql:3306/gooddrive_db
   ```

4. В MySQL (пользователь должен быть создан с тем же паролем)

## Быстрая команда для исправления

```bash
docker compose exec mysql mysql -u root -prootpassword -e "
CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS 'gooddrive_user'@'%';
CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password';
GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%';
FLUSH PRIVILEGES;
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';
"
```

После этого попробуйте импорт снова:

```bash
docker compose exec app node scripts/import-data.js
```
