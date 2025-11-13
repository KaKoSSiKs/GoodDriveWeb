#!/bin/bash
# Скрипт для исправления пользователя MySQL на VPS
# Использование: docker exec -it gooddrive-db mysql -u root -prootpassword < scripts/fix-mysql-user.sql
# Или: docker exec -it gooddrive-db bash -c "mysql -u root -prootpassword < /app/scripts/fix-mysql-user.sql"

echo "Исправление пользователя MySQL..."

# Получаем пароль root из переменных окружения или используем дефолтный
ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-rootpassword}
DB_USER=${MYSQL_USER:-gooddrive_user}
DB_PASSWORD=${MYSQL_PASSWORD:-gooddrive_password}
DB_NAME=${MYSQL_DATABASE:-gooddrive_db}

# Выполняем SQL команды для исправления пользователя
docker exec -i gooddrive-db mysql -u root -p"$ROOT_PASSWORD" <<EOF
-- Изменяем плагин аутентификации на mysql_native_password
ALTER USER '${DB_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD}';

-- Убеждаемся, что права доступа установлены
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';

-- Применяем изменения
FLUSH PRIVILEGES;

-- Проверяем результат
SELECT User, Host, plugin FROM mysql.user WHERE User = '${DB_USER}';
EOF

echo "Готово! Пользователь исправлен."

