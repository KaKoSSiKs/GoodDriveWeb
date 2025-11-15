# 🔧 ИСПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ MYSQL - РАБОЧИЙ СПОСОБ

## Проблема

Пароль из `.env` не совпадает с паролем в контейнере MySQL. MySQL контейнер использует пароль, который был задан при ПЕРВОМ запуске.

## Решение: Использовать переменные окружения из docker-compose

### Способ 1: Через переменные окружения (РЕКОМЕНДУЕТСЯ)

```bash
# Команда использует переменные из docker-compose.yml напрямую
docker compose exec -e MYSQL_ROOT_PASSWORD -e MYSQL_PASSWORD mysql sh -c "
mysql -u root -p\${MYSQL_ROOT_PASSWORD} << 'EOF'
CREATE DATABASE IF NOT EXISTS \`gooddrive_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
DROP USER IF EXISTS 'gooddrive_user'@'%';
CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY '\${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`gooddrive_db\`.* TO 'gooddrive_user'@'%';
FLUSH PRIVILEGES;
SELECT User, Host, plugin FROM mysql.user WHERE User = 'gooddrive_user';
EOF
"
```

### Способ 2: Узнать реальный пароль из контейнера

```bash
# Посмотреть переменные окружения в MySQL контейнере
docker compose exec mysql env | grep MYSQL_ROOT_PASSWORD
docker compose exec mysql env | grep MYSQL_PASSWORD
```

Затем используйте эти пароли в команде.

### Способ 3: Использовать дефолтные значения из docker-compose

В `docker-compose.yml` указаны дефолты:
- `MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}`
- `MYSQL_PASSWORD: ${MYSQL_PASSWORD:-gooddrive_password}`

Попробуйте с дефолтными:

```bash
docker compose exec mysql mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS gooddrive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS 'gooddrive_user'@'%'; CREATE USER 'gooddrive_user'@'%' IDENTIFIED WITH mysql_native_password BY 'gooddrive_password'; GRANT ALL PRIVILEGES ON gooddrive_db.* TO 'gooddrive_user'@'%'; FLUSH PRIVILEGES;"
```

### Способ 4: Войти в MySQL интерактивно

```bash
# Войти в MySQL контейнер
docker compose exec mysql bash

# В контейнере выполнить:
mysql -u root -p
# Введите пароль когда попросит (попробуйте: rootpassword, FVhVbc_6jdmgCBR2R_Vf, или пустой)
```

Затем в MySQL консоли выполните SQL команды вручную.

---

## После исправления пользователя

```bash
docker compose exec app node scripts/import-final.js
```

