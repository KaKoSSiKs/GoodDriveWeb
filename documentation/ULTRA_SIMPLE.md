# ⚡ УЛЬТРА ПРОСТОЕ РЕШЕНИЕ - 2 команды

## Проблема: пароль root неверный

Нужно узнать правильный пароль root из `.env` файла или использовать дефолтный.

## Решение

### Вариант 1: Использовать дефолтный пароль (rootpassword)

```bash
# ШАГ 1: Исправить пользователя
docker compose exec mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"

# ШАГ 2: Импортировать данные
docker compose exec app node scripts/import-final.js
```

### Вариант 2: Узнать пароль из .env

```bash
# На сервере посмотрите пароль root
cat .env | grep MYSQL_ROOT_PASSWORD

# Затем используйте его в команде (замените YOUR_ROOT_PASSWORD):
docker compose exec mysql mysql -u root -pYOUR_ROOT_PASSWORD -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

### Вариант 3: Использовать скрипт (если знаете пароль)

1. Откройте `scripts/fix-user-simple.sh`
2. Измените пароли в начале файла
3. Выполните:

```bash
docker compose cp scripts/fix-user-simple.sh mysql:/tmp/
docker compose exec mysql sh /tmp/fix-user-simple.sh
```

## После исправления пользователя

```bash
# Импортировать данные
docker compose exec app node scripts/import-final.js
```

---

**Самый простой способ:** Попробуйте Вариант 1 с дефолтным паролем `rootpassword`. Если не работает - используйте Вариант 2 чтобы узнать правильный пароль.

