# 🔥 БЫСТРОЕ РЕШЕНИЕ - 3 СПОСОБА

## Проблема
MySQL контейнер был создан с другим паролем. Пароль в `.env` не меняет уже созданный контейнер.

## ✅ РЕШЕНИЕ 1: Использовать скрипт (АВТОМАТИЧЕСКИ)

```bash
# Скрипт сам найдет пароли из контейнера
chmod +x scripts/fix-mysql-user.sh
./scripts/fix-mysql-user.sh
```

## ✅ РЕШЕНИЕ 2: Узнать реальный пароль из контейнера

```bash
# Проверить переменные окружения в MySQL контейнере
docker compose exec mysql env | grep MYSQL_ROOT_PASSWORD
docker compose exec mysql env | grep MYSQL_PASSWORD
```

Затем используйте эти пароли в команде:

```bash
docker compose exec mysql mysql -u root -pНАЙДЕННЫЙ_ПАРОЛЬ -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'НАЙДЕННЫЙ_USER_ПАРОЛЬ'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

## ✅ РЕШЕНИЕ 3: Пересоздать MySQL контейнер (ГАРАНТИРОВАННО)

**ВНИМАНИЕ:** Это удалит все данные в MySQL!

```bash
# Остановить и удалить MySQL контейнер
docker compose stop mysql
docker compose rm -f mysql

# Удалить volume с данными
docker volume rm gooddriveweb_mysql_data

# Запустить заново (создастся с паролями из .env)
docker compose up -d mysql

# Подождать 10 секунд
sleep 10

# Теперь исправить пользователя (используя пароль из .env)
docker compose exec mysql mysql -u root -pFVhVbc_6jdmgCBR2R_Vf -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"

# Импортировать данные
docker compose exec app node scripts/import-final.js
```

---

## 🎯 РЕКОМЕНДУЕТСЯ: Способ 1 (скрипт)

Скрипт автоматически найдет правильные пароли и исправит пользователя.

