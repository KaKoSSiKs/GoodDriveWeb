# 🔧 Исправление MySQL + Импорт данных - Пошаговая инструкция

## Проблема

Ошибка аутентификации MySQL. Нужно сначала исправить пользователя, потом импортировать данные.

## Решение (2 простых шага)

### ШАГ 1: Исправить пользователя MySQL

Выполните на сервере **ОДНУ команду**:

```bash
docker compose exec mysql mysql -u root -pFVhVbc_6jdmgCBR2R_Vf -e "
CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS 'gooddrive_user'@'%';
CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'o7E-PX1P0t32vs3m-z';
GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%';
FLUSH PRIVILEGES;
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';
"
```

**Если пароли другие** - замените в команде:
- `FVhVbc_6jdmgCBR2R_Vf` → ваш `MYSQL_ROOT_PASSWORD`
- `o7E-PX1P0t32vs3m-z` → ваш `MYSQL_PASSWORD`

### ШАГ 2: Импортировать данные

```bash
docker compose exec app node scripts/import-final.js
```

**Всё!** Скрипт импортирует все 4000+ строк.

## Если пароль пользователя другой

Откройте `scripts/import-final.js` и измените строку 18:

```javascript
password: 'ВАШ_ПАРОЛЬ',  // ⬅️ Измените здесь
```

## Проверка после импорта

```bash
# Проверить количество товаров
curl http://localhost:3000/api/health
```

Должно вернуть JSON с `partsCount > 0`.

---

**Итого: 2 команды и всё готово!**

