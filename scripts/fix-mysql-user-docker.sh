#!/bin/sh
# Скрипт для исправления пользователя MySQL в Docker контейнере
# Использование: docker compose exec mysql sh /tmp/fix-mysql-user-docker.sh

echo "🔧 Исправление пользователя MySQL..."

# Получаем переменные из окружения (если переданы) или используем дефолтные
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-FVhVbc_6jdmgCBR2R_Vf}
MYSQL_USER=${MYSQL_USER:-gooddrive_user}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-o7E-PX1P0t32vs3m-z}
MYSQL_DATABASE=${MYSQL_DATABASE:-gooddrive_db}

# Создаем SQL скрипт
cat > /tmp/fix-user-temp.sql << EOF
-- Создаем базу данных (если не существует)
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Удаляем пользователя, если существует (для пересоздания)
DROP USER IF EXISTS '${MYSQL_USER}'@'%';

-- Создаем пользователя с правильным плагином аутентификации
CREATE USER '${MYSQL_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${MYSQL_PASSWORD}';

-- Предоставляем права
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';

-- Применяем изменения
FLUSH PRIVILEGES;

-- Подтверждаем создание пользователя
SELECT User, Host, plugin FROM mysql.user WHERE User = '${MYSQL_USER}';
EOF

# Выполняем SQL скрипт
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < /tmp/fix-user-temp.sql

echo "✅ Пользователь MySQL исправлен"

