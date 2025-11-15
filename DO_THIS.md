# ✅ СДЕЛАЙТЕ ЭТО - Простое решение

## ШАГ 1: Узнайте правильный пароль root

```bash
# На сервере выполните:
cat .env | grep MYSQL_ROOT_PASSWORD
```

Или если .env нет, используйте дефолтный: `rootpassword`

## ШАГ 2: Исправьте пользователя MySQL

Замените `ВАШ_ROOT_ПАРОЛЬ` на пароль из шага 1:

```bash
docker compose exec mysql mysql -u root -pВАШ_ROOT_ПАРОЛЬ -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

**Если не знаете пароль root**, попробуйте дефолтный:

```bash
docker compose exec mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

## ШАГ 3: Импортируйте данные

```bash
docker compose exec app node scripts/import-final.js
```

**Всё!** Данные будут импортированы.

---

## Если пароль пользователя другой

Откройте `scripts/import-final.js` и измените строку 18:

```javascript
password: 'ВАШ_ПАРОЛЬ',  // ⬅️ Измените
```

---

**Итого: 2 команды и готово!**

