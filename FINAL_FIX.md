# ✅ ФИНАЛЬНОЕ РЕШЕНИЕ - ИСПОЛЬЗУЙТЕ ЭТУ КОМАНДУ

## Проблема найдена!

В `docker-compose.yml` healthcheck использует хардкод `rootpassword`. Это значит, что MySQL контейнер был создан с **дефолтным паролем**, а не с паролем из `.env`.

## ✅ КОМАНДА ДЛЯ ИСПРАВЛЕНИЯ:

```bash
docker compose exec mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

**Используйте пароль `rootpassword` (дефолтный), а не `FVhVbc_6jdmgCBR2R_Vf`!**

## После исправления:

```bash
docker compose exec app node scripts/import-final.js
```

---

## Если не работает, проверьте пароль пользователя:

```bash
# Узнать пароль пользователя из .env
cat .env | grep MYSQL_PASSWORD
```

Если пароль пользователя другой, замените `o7E-PX1P0t32vs3m-z` в команде выше на ваш пароль.

